"""FastAPI backend for Study Companion (PS-01). Run: uvicorn main:app --port 8000"""
import os
import time

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from llm import call_gemma
from rag import (chunk_pdf_pages, chunk_text, embed_lmstudio, extract_pdf_text,
                 lmstudio_models, page_tag)
from tutor import (build_audio_script, build_flashcards, explain_notes, generate_quiz,
                   grade_mcq, grade_short, grounded_ask, suggest_questions)

import db

app = FastAPI(title="Study Companion PS-01")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "..", "samples", "photosynthesis.md")

NOTEBOOKS: dict = {}


def nb(nid: str | None) -> dict:
    nid = nid or "default"
    if nid not in NOTEBOOKS:  # cold instance -> hydrate persisted notebook (Postgres if configured)
        loaded = db.load(nid)
        if loaded:
            NOTEBOOKS[nid] = loaded
    return NOTEBOOKS.setdefault(nid, {"raw": "", "chunks": [], "pages": [], "chunk_meta": [],
                                      "quiz": [], "source": "", "files": [], "fileinfo": [],
                                      "filebytes": {}, "size": 0, "created": time.time()})


def persist(nid):
    """Write-through: memory is the cache, DB the source of truth (no-op without POSTGRES_URL)."""
    if nid in NOTEBOOKS:
        db.save(nid, NOTEBOOKS[nid])


def _ingest_text(s, text, label, fname, size):
    text = (text or "").strip()
    if not text:
        return None, "No readable text found."
    nc = chunk_text(text)
    if not nc:
        return None, "No readable text found."
    first = not s["chunks"]
    s["raw"] = text if first else s["raw"] + "\n\n" + text
    s["chunks"] += nc
    s["pages"] += [None] * len(nc)
    s["chunk_meta"] += [{"f": len(s["files"]), "p": None}] * len(nc)
    s["files"].append(fname)
    s["fileinfo"].append({"name": fname, "chunks": len(nc), "size": size, "idx": len(s["fileinfo"]), "pages": 0})
    s["source"] = label if first else s["source"] + f" + {fname}"
    s["quiz"] = []
    s["size"] += size
    return len(nc), None


def _ingest_pdf(s, page_texts, label, fname, size):
    nc, np = chunk_pdf_pages(page_texts)
    if not nc:
        return None, "No readable text found."
    first = not s["chunks"]
    off = max([p for p in s["pages"] if p] or [0])
    full = "\n\n".join(page_texts).strip()
    s["raw"] = full if first else s["raw"] + "\n\n" + full
    s["chunks"] += nc
    s["pages"] += [p + off for p in np]
    s["chunk_meta"] += [{"f": len(s["files"]), "p": p} for p in np]
    s["files"].append(fname)
    s["fileinfo"].append({"name": fname, "chunks": len(nc), "size": size, "idx": len(s["fileinfo"]), "pages": len(page_texts)})
    s["source"] = label if first else s["source"] + f" + {fname}"
    s["quiz"] = []
    s["size"] += size
    return len(nc), None


from html.parser import HTMLParser


class _TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.out, self.skip, self.title = [], False, ""

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "nav", "footer", "header"):
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ("script", "style", "nav", "footer", "header"):
            self.skip = False
        if tag in ("p", "br", "h1", "h2", "h3", "h4", "li", "title"):
            self.out.append("\n")

    def handle_data(self, data):
        if self.skip:
            return
        t = data.strip()
        if t:
            self.out.append(t + " ")


def html_to_text(html):
    import re
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    title = (m.group(1).strip() if m else "")[:120]
    p = _TextParser()
    p.feed(html[:500000])
    text = re.sub(r"[ \t]+", " ", "".join(p.out))
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()[:60000]
    return title, text


class TextIn(BaseModel):
    text: str
    notebook_id: str = "default"


class AskIn(BaseModel):
    question: str
    notebook_id: str = "default"
    files: list | None = None


class ExplainIn(BaseModel):
    level: str = "Simple"
    notebook_id: str = "default"


class QuizGenIn(BaseModel):
    difficulty: str = "Easy"
    notebook_id: str = "default"
    files: list | None = None


class QuizEvalIn(BaseModel):
    answers: list
    notebook_id: str = "default"


class NbIn(BaseModel):
    notebook_id: str = "default"
    files: list | None = None


def scoped(s, file_ids):
    """Restrict retrieval/generation to checked source files (NotebookLM-style toggles).
    Returns (chunks, pages, global_idx)."""
    if not file_ids:
        n = len(s["chunks"])
        return s["chunks"], display_pages(s), list(range(n))
    ids = set(file_ids)
    keep = [i for i, m in enumerate(s.get("chunk_meta", [])) if m and m.get("f") in ids]
    if not keep:
        n = len(s["chunks"])
        return s["chunks"], display_pages(s), list(range(n))
    disp = display_pages(s)
    return [s["chunks"][i] for i in keep], [disp[i] for i in keep], keep


class UrlIn(BaseModel):
    url: str
    notebook_id: str = "default"


def display_file(s):
    files = s["files"]
    return files[0] if len(files) == 1 else f"{len(files)} files" if files else ""


def chunk_display(s, i):
    """Per-file page label, e.g. p.42 (None for pasted text)."""
    try:
        m = s["chunk_meta"][i]
        return f"p.{m['p']}" if m and m.get("p") else None
    except IndexError:
        return page_tag(s["pages"], i)


def chunk_file(s, i):
    try:
        m = s["chunk_meta"][i]
        return m["f"] if m else None
    except IndexError:
        return None


def display_pages(s):
    return [chunk_display(s, i) for i in range(len(s["chunks"]))]


def summary(nid: str):
    s = nb(nid)
    return {"notebook_id": nid, "chunks": len(s["chunks"]),
            "pages": sorted(set(p for p in s["pages"] if p)),
            "source": s["source"], "file": display_file(s), "size": s["size"],
            "files": s.get("fileinfo", []),
            "index": [{"id": f"c{i}", "page": chunk_display(s, i), "file": chunk_file(s, i),
                       "preview": c[:140]} for i, c in enumerate(s["chunks"])]}


@app.get("/api/health")
def health():
    ids = lmstudio_models()
    chat = [i for i in ids if "embed" not in i.lower()]
    emb = [i for i in ids if "embed" in i.lower()]
    return {"ok": True, "chat_model": chat[0] if chat else None,
            "embed_model": emb[0] if emb else None, "persist": db.enabled()}


@app.get("/api/notebooks/{nid}")
def get_nb(nid: str):
    s = nb(nid)  # read-through: hydrates from DB on a cold instance
    if not s["chunks"]:
        return {"error": "Notebook empty or missing. Upload notes first."}
    return summary(nid)


@app.get("/api/files/{nid}/{idx}")
def serve_file(nid: str, idx: int):
    from fastapi.responses import Response
    s = nb(nid)
    try:
        name, data = s["filebytes"][int(idx)]
    except (IndexError, KeyError, ValueError):
        return {"error": "File not found."}
    ctype = "application/pdf" if name.lower().endswith(".pdf") else "text/plain"
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'inline; filename="{name}"'})


@app.post("/api/notes/sample")
def load_sample(body: TextIn):
    s = nb(body.notebook_id)
    with open(SAMPLE_PATH, encoding="utf-8") as f:
        s["raw"] = f.read()
    s["chunks"] = chunk_text(s["raw"])
    s["pages"] = [None] * len(s["chunks"])
    s["quiz"] = []
    s["source"] = "sample: photosynthesis"
    s["files"] = ["photosynthesis.md"]
    s["fileinfo"] = [{"name": "photosynthesis.md", "chunks": len(s["chunks"]), "size": len(s["raw"]), "idx": 0, "pages": 0}]
    s["chunk_meta"] = [{"f": 0, "p": None}] * len(s["chunks"])
    s["size"] = len(s["raw"])
    persist(body.notebook_id)
    return summary(body.notebook_id)


@app.post("/api/notes/text")
def load_text(body: TextIn):
    s = nb(body.notebook_id)
    n, err = _ingest_text(s, body.text, "pasted text", "pasted-notes.txt", len(body.text))
    if err:
        return {"error": err}
    persist(body.notebook_id)
    return summary(body.notebook_id)


@app.post("/api/notes/url")
def load_url(body: UrlIn):
    import requests
    s = nb(body.notebook_id)
    try:
        r = requests.get(body.url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        title, text = html_to_text(r.text)
    except Exception as e:
        return {"error": f"Could not fetch URL ({e})."}
    label = title or body.url[:60]
    n, err = _ingest_text(s, f"{label}\n\n{text}", label, body.url[:80], len(text))
    if err:
        return {"error": "No readable text found at that URL."}
    persist(body.notebook_id)
    return summary(body.notebook_id)


@app.post("/api/notes/upload")
async def upload(file: UploadFile = File(...), notebook_id: str = Form("default")):
    s = nb(notebook_id)
    data = await file.read()
    s["filebytes"][len(s["files"])] = (file.filename, data)
    s["size"] = len(data)
    s["file"] = file.filename
    if file.filename.lower().endswith(".pdf"):
        text, npages, page_texts = extract_pdf_text(data)
        if not text:
            return {"error": f"Could not read PDF ({npages}). Try a text-based PDF."}
        n, err = _ingest_pdf(s, page_texts, f"{file.filename} ({npages} pages)", file.filename, len(data))
        if err:
            return {"error": err}
    else:
        n, err = _ingest_text(s, data.decode("utf-8", "ignore"), file.filename, file.filename, len(data))
        if err:
            return {"error": err}
    persist(notebook_id)
    return summary(notebook_id)


@app.post("/api/notes/clear")
def clear(body: TextIn):
    NOTEBOOKS[body.notebook_id] = {"raw": "", "chunks": [], "pages": [], "chunk_meta": [], "quiz": [],
                                   "source": "", "files": [], "fileinfo": [], "filebytes": {},
                                   "size": 0, "created": time.time()}
    db.delete(body.notebook_id)
    return {"ok": True}


@app.get("/api/chunks/{nid}/{cid}")
def chunk_text_full(nid: str, cid: str):
    s = nb(nid)
    try:
        i = int(cid[1:])
        return {"id": cid, "page": chunk_display(s, i), "file": chunk_file(s, i), "text": s["chunks"][i]}
    except (IndexError, ValueError):
        return {"error": "Chunk not found."}


@app.post("/api/flashcards")
def flashcards(body: NbIn):
    s = nb(body.notebook_id)
    if not s["chunks"]:
        return {"error": "Load notes first."}
    cards = build_flashcards(s["chunks"], display_pages(s))
    for c in cards:
        ci = c.get("chunk")
        c["file"] = chunk_file(s, ci) if isinstance(ci, int) else None
    return {"cards": cards}


def tag_evidence(s, items, key="chunk"):
    """Attach per-file page + file idx to evidence/quiz items carrying a chunk index."""
    for it in items:
        ci = it.get(key)
        if isinstance(ci, str) and ci.startswith("c"):
            try:
                ci = int(ci[1:])
            except ValueError:
                continue
        if isinstance(ci, int) and 0 <= ci < len(s["chunks"]):
            it["page"] = chunk_display(s, ci)
            it["file"] = chunk_file(s, ci)
    return items


@app.post("/api/tutor/ask")
def ask(body: AskIn):
    s = nb(body.notebook_id)
    if not s["chunks"]:
        return {"error": "Load notes first."}
    chunks, pages, gidx = scoped(s, body.files)
    r = grounded_ask(body.question, chunks, pages, body.notebook_id)
    if isinstance(r, dict) and "evidence" in r:
        for e in r["evidence"]:  # local -> global chunk ids
            try:
                e["chunk_id"] = f"c{gidx[int(e['chunk_id'][1:])]}"
            except (ValueError, IndexError, KeyError):
                pass
        tag_evidence(s, r["evidence"], key="chunk_id")
    return r


@app.post("/api/tutor/explain")
def explain(body: ExplainIn):
    s = nb(body.notebook_id)
    if not s["chunks"]:
        return {"error": "Load notes first."}
    text, model = explain_notes(s["chunks"], body.level)
    return {"text": text, "model": model}


@app.post("/api/suggest")
def suggest(body: NbIn):
    s = nb(body.notebook_id)
    if not s["chunks"]:
        return {"error": "Load notes first."}
    chunks, pages, _ = scoped(s, body.files)
    return {"questions": suggest_questions(chunks, pages)}


@app.post("/api/quiz/generate")
def quiz_gen(body: QuizGenIn):
    s = nb(body.notebook_id)
    if not s["chunks"]:
        return {"error": "Load notes first."}
    chunks, pages, gidx = scoped(s, body.files)
    items, src = generate_quiz(chunks, body.difficulty, pages, body.notebook_id)
    for it in items:  # local -> global chunk indices
        if isinstance(it.get("chunk"), int) and 0 <= it["chunk"] < len(gidx):
            it["chunk"] = gidx[it["chunk"]]
    s["quiz"] = tag_evidence(s, items)
    persist(body.notebook_id)
    return {"questions": items, "source": src}


@app.post("/api/audio")
def audio(body: NbIn):
    s = nb(body.notebook_id)
    if not s["chunks"]:
        return {"error": "Load notes first."}
    chunks, pages, _ = scoped(s, body.files)
    return {"script": build_audio_script(chunks, pages)}


@app.post("/api/quiz/evaluate")
def quiz_eval(body: QuizEvalIn):
    s = nb(body.notebook_id)
    quiz = s["quiz"]
    if not quiz:
        return {"error": "Generate a quiz first."}
    results, score = [], 0
    for idx, item in enumerate(quiz):
        given = body.answers[idx] if idx < len(body.answers) else None
        if item.get("type") == "mcq":
            res = grade_mcq(item, given)
        else:
            ci = item.get("chunk", 0)
            pg = page_tag(s["pages"], ci) if isinstance(ci, int) else None
            hint = f"chunk c{ci} ({pg})" if pg else (f"chunk c{ci}" if "chunk" in item else "")
            res = grade_short(item.get("answer", ""), given or "", hint)
        results.append(res)
        score += bool(res["correct"])
    return {"score": score, "total": len(quiz), "results": results}
