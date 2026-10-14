"""FastAPI backend for Study Companion (PS-01). Run: uvicorn main:app --port 8000"""
import os
import time

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from llm import call_gemma
from rag import (chunk_pdf_pages, chunk_text, embed_lmstudio, extract_pdf_text,
                 lmstudio_models, page_tag)
from tutor import (explain_notes, generate_quiz, grade_mcq, grade_short,
                   grounded_ask)

app = FastAPI(title="Study Companion PS-01")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "..", "samples", "photosynthesis.md")

NOTEBOOKS: dict = {}


def nb(nid: str | None) -> dict:
    nid = nid or "default"
    return NOTEBOOKS.setdefault(nid, {"raw": "", "chunks": [], "pages": [], "quiz": [],
                                      "source": "", "file": "", "size": 0, "created": time.time()})


class TextIn(BaseModel):
    text: str
    notebook_id: str = "default"


class AskIn(BaseModel):
    question: str
    notebook_id: str = "default"


class ExplainIn(BaseModel):
    level: str = "Simple"
    notebook_id: str = "default"


class QuizGenIn(BaseModel):
    difficulty: str = "Easy"
    notebook_id: str = "default"


class QuizEvalIn(BaseModel):
    answers: list
    notebook_id: str = "default"


def summary(nid: str):
    s = nb(nid)
    return {"notebook_id": nid, "chunks": len(s["chunks"]),
            "pages": sorted(set(p for p in s["pages"] if p)),
            "source": s["source"], "file": s["file"], "size": s["size"],
            "index": [{"id": f"c{i}", "page": page_tag(s["pages"], i),
                       "preview": c[:140]} for i, c in enumerate(s["chunks"])]}


@app.get("/api/health")
def health():
    ids = lmstudio_models()
    chat = [i for i in ids if "embed" not in i.lower()]
    emb = [i for i in ids if "embed" in i.lower()]
    return {"ok": True, "chat_model": chat[0] if chat else None,
            "embed_model": emb[0] if emb else None}


@app.get("/api/notebooks/{nid}")
def get_nb(nid: str):
    if nid not in NOTEBOOKS or not NOTEBOOKS[nid]["chunks"]:
        return {"error": "Notebook empty or missing. Upload notes first."}
    return summary(nid)


@app.post("/api/notes/sample")
def load_sample(body: TextIn):
    s = nb(body.notebook_id)
    with open(SAMPLE_PATH, encoding="utf-8") as f:
        s["raw"] = f.read()
    s["chunks"] = chunk_text(s["raw"])
    s["pages"] = [None] * len(s["chunks"])
    s["quiz"] = []
    s["source"] = "sample: photosynthesis"
    s["file"] = "photosynthesis.md"
    s["size"] = len(s["raw"])
    return summary(body.notebook_id)


@app.post("/api/notes/text")
def load_text(body: TextIn):
    s = nb(body.notebook_id)
    s["raw"] = body.text
    s["chunks"] = chunk_text(body.text)
    s["pages"] = [None] * len(s["chunks"])
    s["quiz"] = []
    s["source"] = "pasted text"
    s["file"] = "pasted-notes.txt"
    s["size"] = len(body.text)
    return summary(body.notebook_id)


@app.post("/api/notes/upload")
async def upload(file: UploadFile = File(...), notebook_id: str = Form("default")):
    s = nb(notebook_id)
    data = await file.read()
    s["size"] = len(data)
    s["file"] = file.filename
    if file.filename.lower().endswith(".pdf"):
        text, npages, page_texts = extract_pdf_text(data)
        if not text:
            return {"error": f"Could not read PDF ({npages}). Try a text-based PDF."}
        s["raw"] = text
        s["chunks"], s["pages"] = chunk_pdf_pages(page_texts)
        s["source"] = f"{file.filename} ({npages} pages)"
    else:
        s["raw"] = data.decode("utf-8", "ignore")
        s["chunks"] = chunk_text(s["raw"])
        s["pages"] = [None] * len(s["chunks"])
        s["source"] = file.filename
    s["quiz"] = []
    return summary(notebook_id)


@app.post("/api/notes/clear")
def clear(body: TextIn):
    NOTEBOOKS[body.notebook_id] = {"raw": "", "chunks": [], "pages": [], "quiz": [],
                                   "source": "", "file": "", "size": 0, "created": time.time()}
    return {"ok": True}


@app.post("/api/tutor/ask")
def ask(body: AskIn):
    s = nb(body.notebook_id)
    if not s["chunks"]:
        return {"error": "Load notes first."}
    return grounded_ask(body.question, s["chunks"], s["pages"], body.notebook_id)


@app.post("/api/tutor/explain")
def explain(body: ExplainIn):
    s = nb(body.notebook_id)
    if not s["chunks"]:
        return {"error": "Load notes first."}
    text, model = explain_notes(s["chunks"], body.level)
    return {"text": text, "model": model}


@app.post("/api/quiz/generate")
def quiz_gen(body: QuizGenIn):
    s = nb(body.notebook_id)
    if not s["chunks"]:
        return {"error": "Load notes first."}
    items, src = generate_quiz(s["chunks"], body.difficulty, s["pages"], body.notebook_id)
    s["quiz"] = items
    return {"questions": items, "source": src}


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
