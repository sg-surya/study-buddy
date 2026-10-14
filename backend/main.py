"""FastAPI backend for Study Companion (PS-01). Run: uvicorn main:app --port 8000"""
import os

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from llm import call_gemma
from rag import (chunk_pdf_pages, chunk_text, extract_pdf_text, lmstudio_models,
                 page_tag)
from tutor import (explain_notes, generate_quiz, grade_mcq, grade_short,
                   grounded_ask)

app = FastAPI(title="Study Companion PS-01")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "..", "samples", "photosynthesis.md")

SESSION = {"raw": "", "chunks": [], "pages": [], "quiz": [], "source": ""}


class TextIn(BaseModel):
    text: str


class AskIn(BaseModel):
    question: str


class ExplainIn(BaseModel):
    level: str = "Simple"


class QuizGenIn(BaseModel):
    difficulty: str = "Easy"


class QuizEvalIn(BaseModel):
    answers: list


def notes_summary():
    return {"chunks": len(SESSION["chunks"]),
            "pages": sorted(set(p for p in SESSION["pages"] if p)),
            "source": SESSION["source"],
            "index": [{"id": f"c{i}", "page": page_tag(SESSION["pages"], i),
                       "preview": c[:140]} for i, c in enumerate(SESSION["chunks"])]}


@app.get("/api/health")
def health():
    ids = lmstudio_models()
    chat = [i for i in ids if "embed" not in i.lower()]
    emb = [i for i in ids if "embed" in i.lower()]
    return {"ok": True, "chat_model": chat[0] if chat else None,
            "embed_model": emb[0] if emb else None, "notes_loaded": bool(SESSION["chunks"])}


@app.post("/api/notes/sample")
def load_sample():
    with open(SAMPLE_PATH, encoding="utf-8") as f:
        SESSION["raw"] = f.read()
    SESSION["chunks"] = chunk_text(SESSION["raw"])
    SESSION["pages"] = [None] * len(SESSION["chunks"])
    SESSION["quiz"] = []
    SESSION["source"] = "sample: photosynthesis"
    return notes_summary()


@app.post("/api/notes/text")
def load_text(body: TextIn):
    SESSION["raw"] = body.text
    SESSION["chunks"] = chunk_text(body.text)
    SESSION["pages"] = [None] * len(SESSION["chunks"])
    SESSION["quiz"] = []
    SESSION["source"] = "pasted text"
    return notes_summary()


@app.post("/api/notes/upload")
async def upload(file: UploadFile = File(...)):
    data = await file.read()
    if file.filename.lower().endswith(".pdf"):
        text, npages, page_texts = extract_pdf_text(data)
        if not text:
            return {"error": f"Could not read PDF ({npages}). Try a text-based PDF."}
        SESSION["raw"] = text
        SESSION["chunks"], SESSION["pages"] = chunk_pdf_pages(page_texts)
        SESSION["source"] = f"{file.filename} ({npages} pages)"
    else:
        SESSION["raw"] = data.decode("utf-8", "ignore")
        SESSION["chunks"] = chunk_text(SESSION["raw"])
        SESSION["pages"] = [None] * len(SESSION["chunks"])
        SESSION["source"] = file.filename
    SESSION["quiz"] = []
    out = notes_summary()
    out["file"] = SESSION["source"]
    return out


@app.post("/api/notes/clear")
def clear():
    SESSION.update({"raw": "", "chunks": [], "pages": [], "quiz": [], "source": ""})
    return {"ok": True}


@app.post("/api/tutor/ask")
def ask(body: AskIn):
    if not SESSION["chunks"]:
        return {"error": "Load notes first."}
    return grounded_ask(body.question, SESSION["chunks"], SESSION["pages"])


@app.post("/api/tutor/explain")
def explain(body: ExplainIn):
    if not SESSION["chunks"]:
        return {"error": "Load notes first."}
    text, model = explain_notes(SESSION["chunks"], body.level)
    return {"text": text, "model": model}


@app.post("/api/quiz/generate")
def quiz_gen(body: QuizGenIn):
    if not SESSION["chunks"]:
        return {"error": "Load notes first."}
    items, src = generate_quiz(SESSION["chunks"], body.difficulty, SESSION["pages"])
    SESSION["quiz"] = items
    return {"questions": items, "source": src}


@app.post("/api/quiz/evaluate")
def quiz_eval(body: QuizEvalIn):
    quiz = SESSION["quiz"]
    if not quiz:
        return {"error": "Generate a quiz first."}
    results, score = [], 0
    for idx, item in enumerate(quiz):
        given = body.answers[idx] if idx < len(body.answers) else None
        if item.get("type") == "mcq":
            res = grade_mcq(item, given)
        else:
            ci = item.get("chunk", 0)
            pg = page_tag(SESSION["pages"], ci) if isinstance(ci, int) else None
            hint = f"chunk c{ci} ({pg})" if pg else (f"chunk c{ci}" if "chunk" in item else "")
            res = grade_short(item.get("answer", ""), given or "", hint)
        results.append(res)
        score += bool(res["correct"])
    return {"score": score, "total": len(quiz), "results": results}
