"""PS-01 Study Companion — minimal monolith (ponytail: single file until split is forced)."""
import os
import re
import json
import time
import math
import requests

import streamlit as st
from collections import Counter

LMSTUDIO_URL = os.environ.get("LMSTUDIO_URL", "http://localhost:1234/v1")

# shortcut: TF-IDF only, no embeddings; upgrade to sentence-transformers if retrieval quality fails

SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "samples", "photosynthesis.md")

CANNED_QUIZ = [
    {"q": "Where does photosynthesis mainly occur?", "type": "mcq",
     "options": ["Mitochondria", "Chloroplasts", "Nucleus", "Ribosomes"],
     "answer": "Chloroplasts", "explanation": "Notes §2: photosynthesis takes place inside chloroplasts.", "chunk": 1},
    {"q": "Which pigment captures light energy?", "type": "mcq",
     "options": ["Melanin", "Hemoglobin", "Chlorophyll", "Keratin"],
     "answer": "Chlorophyll", "explanation": "Notes §2/§4: chlorophyll captures red and blue light.", "chunk": 1},
    {"q": "Where do light-dependent reactions occur?", "type": "mcq",
     "options": ["Stroma", "Thylakoid membranes", "Cytoplasm", "Cell wall"],
     "answer": "Thylakoid membranes", "explanation": "Notes §3: light-dependent reactions occur in thylakoid membranes.", "chunk": 2},
    {"q": "Name the two stages of photosynthesis.", "type": "short",
     "answer": "Light-dependent reactions and Calvin cycle",
     "explanation": "Notes §3 lists both stages.", "chunk": 2},
    {"q": "Name one factor affecting the rate of photosynthesis.", "type": "short",
     "answer": "Light intensity (or CO2 concentration, or temperature)",
     "explanation": "Notes §5: light intensity, CO2 concentration, temperature.", "chunk": 4},
]


def chunk_text(text, size=700, overlap=120):
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, cur = [], ""
    for p in paras:
        if len(cur) + len(p) < size:
            cur += ("\n\n" + p if cur else p)
        else:
            if cur:
                chunks.append(cur)
            # overlap: keep tail
            cur = (cur[-overlap:] + "\n\n" + p) if cur else p
            if len(cur) >= size:
                chunks.append(cur)
                cur = ""
    if cur:
        chunks.append(cur)
    return [c for c in chunks if c.strip()]


def extract_pdf_text(file_bytes):
    """PDF -> text via pypdf. Returns (full_text, page_count, page_texts). Never crashes demo."""
    try:
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        parts = [(p.extract_text() or "") for p in reader.pages]
        return "\n\n".join(parts).strip(), len(reader.pages), parts
    except Exception as e:
        return "", f"pdf-error: {e}", []


def chunk_pdf_pages(page_texts, size=700):
    """Chunk each PDF page separately so every chunk maps to exactly one page."""
    chunks, pages = [], []
    for pn, pt in enumerate(page_texts, 1):
        if not pt.strip():
            continue
        for c in chunk_text(pt, size=size):
            chunks.append(c)
            pages.append(pn)
    return chunks, pages


def page_tag(pages, idx):
    p = (pages or [None])[idx] if idx < len(pages or []) else None
    return f"p.{p}" if p else None


def _tokens(s):
    return re.findall(r"[a-z]{3,}", s.lower())


def embed_lmstudio(texts, base=None):
    """Real embeddings via LM Studio /embeddings. Returns (vectors, model_id) or (None, reason)."""
    base = base or LMSTUDIO_URL
    ids = lmstudio_models(base)
    emb_ids = [i for i in ids if "embed" in i.lower()] or ids
    if not emb_ids:
        return None, "no-embedding-model"
    try:
        r = requests.post(f"{base}/embeddings", timeout=60,
                          json={"model": emb_ids[0], "input": texts})
        vecs = [d["embedding"] for d in r.json()["data"]]
        return vecs, emb_ids[0]
    except Exception as e:
        return None, f"embed-error: {e}"


def _cos(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (na * nb)


def retrieve_tfidf(query, chunks, k=3):
    docs = [_tokens(c) for c in chunks]
    qtok = _tokens(query)
    df = Counter()
    for d in docs:
        for t in set(d):
            df[t] += 1
    n = len(docs)
    def vec(tok):
        tf = Counter(tok)
        return {t: (tf[t] / max(len(tok), 1)) * math.log((n + 1) / (df.get(t, 0) + 1)) for t in tf}
    qv = vec(qtok)
    qn = math.sqrt(sum(v * v for v in qv.values())) or 1.0
    out = []
    for i, d in enumerate(docs):
        dv = vec(d)
        dot = sum(qv.get(t, 0) * dv.get(t, 0) for t in qv)
        dn = math.sqrt(sum(v * v for v in dv.values())) or 1.0
        out.append((i, dot / (qn * dn), chunks[i]))
    return sorted(out, key=lambda x: x[1], reverse=True)[:k]


def retrieve(query, chunks, k=3):
    # Real RAG: LM Studio embeddings first, TF-IDF fallback (no sklearn/scipy — numpy2 conflict)
    if not chunks:
        return []
    if len(chunks) == 1:
        return [(0, 1.0, chunks[0])]
    vecs, _ = embed_lmstudio(chunks + [query])
    if isinstance(vecs, list) and len(vecs) == len(chunks) + 1:
        qv, scored = vecs[-1], []
        for i, cv in enumerate(vecs[:-1]):
            try:
                scored.append((i, float(_cos(qv, cv)), chunks[i]))
            except Exception:
                pass
        if scored:
            return sorted(scored, key=lambda x: x[1], reverse=True)[:k]
    return retrieve_tfidf(query, chunks, k)


def lmstudio_models(base=None):
    base = base or LMSTUDIO_URL
    try:
        r = requests.get(f"{base}/models", timeout=4)
        return [m["id"] for m in r.json().get("data", [])]
    except Exception:
        return []


def call_lmstudio(prompt, system="You are a helpful tutor.", model=None, base=None):
    """LM Studio OpenAI-compatible call. Returns (text, model_id) or (None, reason)."""
    base = base or LMSTUDIO_URL
    model = model or os.environ.get("LMSTUDIO_MODEL", "")
    if not model:  # auto-pick first non-embedding model
        ids = lmstudio_models(base)
        llm_ids = [i for i in ids if "embed" not in i.lower()]
        model = (llm_ids or ids or [""])[0] if ids else ""
    if not model:
        return None, "lmstudio-no-model (load Gemma in LM Studio first)"
    try:
        t0 = time.time()
        r = requests.post(f"{base}/chat/completions", timeout=90, json={
            "model": model, "temperature": 0.3,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": prompt}]})
        return r.json()["choices"][0]["message"]["content"], f"lmstudio:{model} ({time.time()-t0:.1f}s)"
    except Exception as e:
        return None, f"lmstudio-error: {e}"


def call_gemma(prompt, system="You are a helpful tutor."):
    """Provider order: LM Studio -> Google AI Studio -> None. Returns (text, model_id) or (None, reason)."""
    raw, mid = call_lmstudio(prompt, system)
    if raw:
        return raw, mid
    lm_reason = mid
    key = os.environ.get("GEMMA_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
    model = os.environ.get("GEMMA_MODEL", "gemma-3-27b-it")
    if not key:
        return None, f"{lm_reason} + google-no-key"
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        t0 = time.time()
        resp = genai.GenerativeModel(model).generate_content(system + "\n\n" + prompt)
        return resp.text, f"google:{model} ({time.time()-t0:.1f}s)"
    except Exception as e:  # offline-safe: fall back, never crash demo
        return None, f"{lm_reason} + google-error: {e}"


def extractive_answer(question, chunks, pages=None):
    top = retrieve(question, chunks, k=3)
    scores = [(i, round(s, 3)) for i, s, _ in top]
    if not top or top[0][1] < 0.12:
        return {"answer": "I couldn't find this in your notes. Try asking about what the notes cover (e.g. chlorophyll, chloroplasts, the two stages), or paste more notes.",
                "evidence": [], "verdict": "NOT_FOUND", "model": "extractive-fallback", "scores": scores}
    i, s, txt = top[0]
    ev = [{"chunk_id": f"c{i}", "quote": txt[:280], "page": page_tag(pages, i)}]
    return {"answer": txt[:600], "evidence": ev, "verdict": "SUPPORTED", "model": "extractive-fallback", "scores": scores}


def grounded_ask(question, chunks, pages=None):
    top = retrieve(question, chunks, k=4)
    scores = [(i, round(s, 3)) for i, s, _ in top]
    if not top or top[0][1] < 0.12:
        return {"answer": "I couldn't find this in your notes. Your notes cover photosynthesis basics (§1–§6) but not this topic. Add notes on it or ask about chlorophyll, stages, or factors.",
                "evidence": [], "verdict": "NOT_FOUND", "model": "extractive-fallback", "scores": scores}
    ctx = "\n\n".join(f"[c{i}] {t}" for i, _, t in top)
    prompt = ("You are a tutor. Answer ONLY from NOTE CHUNKS. Cite like [c0]. "
              "If absent, reply exactly: NOT_FOUND. Keep under 150 words.\n\n"
              f"NOTES:\n{ctx}\n\nQUESTION: {question}\n"
              'Reply as JSON: {"answer":"...","evidence":[{"chunk_id":"c0","quote":"..."}],"verdict":"SUPPORTED|NOT_FOUND"}')
    raw, model = call_gemma(prompt)
    if raw is None:  # no key / error -> extractive path so demo never dies
        r = extractive_answer(question, chunks, pages)
        r["model"] = f"extractive-fallback ({model})"
        return r
    try:
        m = re.search(r"\{.*\}", raw, re.S)
        data = json.loads(m.group(0))
        # verify quotes are real substrings (anti-hallucination gate)
        ok_ev = []
        for e in data.get("evidence", []):
            for ci, c in enumerate(chunks):
                if e.get("quote", "")[:60] in c:
                    e["chunk_id"] = f"c{ci}"
                    e["page"] = page_tag(pages, ci)
                    ok_ev.append(e)
                    break
        data["evidence"] = ok_ev
        if not ok_ev:
            data["verdict"] = "NOT_FOUND"
            data["answer"] = "I couldn't find solid evidence in your notes for this. " + data.get("answer", "")
        data["model"] = model
        data["scores"] = scores
        return data
    except Exception:
        r = extractive_answer(question, chunks, pages)
        r["model"] = f"{model}+extractive"
        return r


STOPWORDS = set("""what which where when with from that this these those they them then than there their have has had were was are our your its into over under about after before between through during each every very much many most some such only also just can will would should could may might must shall upon per via within without within""".split())

GENERIC = set("""while simple generally commonly usually often known called experience experiences taken given takes makes gives goes seems shown found still already even ever always sometimes rather quite particularly various several specific basic important mainly mostly nearly almost enough though although whether whole entire single double half done make made use uses using get gets got keep kept put puts seem show shows take took come comes came go went find finds thing things way ways part parts kind kinds fact facts case cases order along across among around behind below beside beyond inside outside toward towards among""".split())


def is_header(s):
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return True
    if sum(1 for c in letters if c.isupper()) / len(letters) > 0.5:
        return True
    return bool(re.match(r"(?i)^(chapter|figure|table|unit|section|exercise|contents|index)\b", s.strip()))


def content_terms(chunks):
    all_terms = Counter(t for c in chunks for t in _tokens(c) if t not in STOPWORDS and t not in GENERIC and len(t) >= 5)
    caps = set()
    for c in chunks:
        for w in re.findall(r"\b[A-Z][a-z]{4,}\b", c):
            caps.add(w.lower())
    return all_terms, caps


def pick_keyword(s, all_terms, caps, used, min_freq=2):
    toks = _tokens(s)
    first = toks[0] if toks else ""
    best, best_score = None, -1.0
    for t in toks:
        if t in used or all_terms.get(t, 0) < min_freq or len(t) < 6:
            continue
        score = all_terms[t] * (0.4 if t == first else 1.0) * (1.5 if t in caps else 1.0)
        if score > best_score:
            best, best_score = t, score
    return best


def key_sentences(chunks, per_chunk=2):
    """Pick information-dense sentences per chunk, scored by length + rare-term weight."""
    all_tok = Counter(t for c in chunks for t in _tokens(c))
    per_chunk = max(per_chunk, -(-5 // max(len(chunks), 1)))  # small notes -> more per chunk
    out = []
    for ci, c in enumerate(chunks):
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", c) if len(s.strip().split()) >= 6]
        scored = []
        for s in sents:
            toks = [t for t in _tokens(s) if t not in STOPWORDS]
            score = sum(1.0 / (1 + all_tok[t]) for t in set(toks)) * 100 + len(toks)
            scored.append((score, s))
        for _, s in sorted(scored, reverse=True)[:per_chunk]:
            out.append((ci, s))
    return out


def build_extractive_quiz(chunks, pages=None):
    """Real quiz built from the ACTUAL loaded notes — works on any PDF, no LLM needed."""
    sents = key_sentences(chunks)
    if len(sents) < 3:
        return CANNED_QUIZ, "canned"
    all_terms, caps = content_terms(chunks)
    pool = [t for t, _ in all_terms.most_common(40) if all_terms[t] >= 2]
    quiz, used = [], set()
    for ci, s in sents:
        if is_header(s):
            continue
        src = f"c{ci} ({page_tag(pages, ci)})" if page_tag(pages, ci) else f"c{ci}"
        if len([q for q in quiz if q["type"] == "mcq"]) < 3:
            ans = pick_keyword(s, all_terms, caps, used)
            if not ans:
                continue
            used.add(ans)
            distract = [t for t in pool if t != ans and t not in s.lower()][:3]
            while len(distract) < 3:
                distract.append("none of these")
            q = {"q": f"Fill in the blank: {re.sub(re.escape(ans), '____', s, flags=re.I)[:220]}",
                 "type": "mcq", "options": sorted([ans] + distract[:3]),
                 "answer": ans, "explanation": f"From {src}: “{s[:180]}…”", "chunk": ci,
                 "page": page_tag(pages, ci)}
            quiz.append(q)
        elif len(quiz) < 5:
            key = pick_keyword(s, all_terms, caps, used, min_freq=1) or "this section"
            quiz.append({"q": f"In your own words: what do your notes say about '{key}'?",
                         "type": "short", "answer": s[:300],
                         "explanation": f"Expected the idea of {src}: “{s[:180]}…”", "chunk": ci,
                         "page": page_tag(pages, ci)})
        if len(quiz) >= 5:
            break
    return (quiz, "extractive-rag") if len(quiz) >= 3 else (CANNED_QUIZ, "canned")


def generate_quiz(chunks, difficulty="Easy", pages=None):
    """Order: LLM quiz gen (RAG prompt) -> extractive quiz from real notes -> canned."""
    diverse = [t for _, _, t in retrieve("key concepts definitions stages factors examples", chunks, k=6)]
    ctx = "\n\n".join(diverse or chunks[:6])[:4000]
    prompt = (f"From these NOTES write 5 questions (3 MCQ with 4 options, 2 short-answer). "
              f"Difficulty: {difficulty}. Spread across different parts. Stay strictly within notes.\nNOTES:\n{ctx}\n"
              'Reply ONLY as JSON list: [{"q":"...","type":"mcq|short","options":[...],"answer":"...","explanation":"..."}]')
    raw, _ = call_gemma(prompt, "You write exam questions from notes.")
    if raw:
        try:
            m = re.search(r"\[.*\]", raw, re.S)
            items = json.loads(m.group(0))
            if len(items) >= 3:
                return items[:5], "ai"
        except Exception:
            pass
    return build_extractive_quiz(chunks, pages)


def explain_notes(chunks, level="Simple"):
    ctx = "\n\n".join(chunks[:6])[:4000]
    prompt = (f"Explain ONLY using these study notes (do not add facts from outside them) "
              f"at {level} level in under 200 words with 3 key takeaways.\nNOTES:\n{ctx}")
    raw, mid = call_gemma(prompt, "You explain study material simply and never invent facts beyond the notes.")
    if raw:
        return raw, mid
    top = " ".join(chunks[:2])[:800]
    return f"**Key points from your notes:**\n\n{top}...\n\n(Load a Gemma model in LM Studio for a full simple explanation — {mid}.)", "extractive-fallback"


def grade_short(expected, given, chunk_hint=""):
    if not (given or "").strip():  # blank answer: never ask LLM (it hallucinates passes)
        return {"correct": False, "explanation": "No answer written.",
                "hint": f"Write your answer from {chunk_hint}." if chunk_hint else "Write your answer from the cited page."}
    prompt = (f"Expected: {expected}\nStudent: {given}\n"
              'Judge as JSON: {"correct": true/false, "explanation":"1-2 sentences on misconception","hint":"hint without giving answer"}. '
              'A blank, "idk", or unrelated answer is always {"correct": false}.')
    raw, _ = call_gemma(prompt)
    if raw:
        try:
            return json.loads(re.search(r"\{.*\}", raw, re.S).group(0))
        except Exception:
            pass
    # Real similarity fallback: embeddings first, keyword overlap otherwise
    sim, hit = 0.0, False
    vecs, _ = embed_lmstudio([expected, given or ""])
    if isinstance(vecs, list) and len(vecs) == 2:
        try:
            sim = _cos(vecs[0], vecs[1])
            hit = sim >= 0.72
            partial = 0.55 <= sim < 0.72
        except Exception:
            partial = False
    else:
        exp_keys = set(re.findall(r"[A-Za-z]{4,}", expected.lower()))
        giv = (given or "").lower()
        overlap = sum(1 for w in exp_keys if w in giv) / max(len(exp_keys), 1)
        sim, hit, partial = overlap, overlap >= 0.5, 0.25 <= overlap < 0.5
    if hit:
        return {"correct": True, "explanation": f"Correct (similarity {sim:.2f}).", "hint": ""}
    if partial:
        return {"correct": False, "explanation": f"Partly right (similarity {sim:.2f}) — missing key terms. Expected: {expected[:160]}.",
                "hint": f"Re-read {chunk_hint} and include the exact key terms." if chunk_hint else "Add the exact key terms from your notes."}
    return {"correct": False,
            "explanation": f"Not quite (similarity {sim:.2f}). Expected something like: {expected[:200]}",
            "hint": f"Re-read {chunk_hint}." if chunk_hint else "Re-read the cited chunk."}


# ---- UI ----
st.set_page_config(page_title="Study Companion (PS-01)", layout="wide")
st.title("📚 Study Companion — from Real Notes (PS-01)")

if "chunks" not in st.session_state:
    st.session_state.chunks = []
if "quiz" not in st.session_state:
    st.session_state.quiz = []

with st.sidebar:
    st.subheader("🤖 Model (LM Studio)")
    lm_url = st.text_input("Base URL", LMSTUDIO_URL, key="lm_url")
    ids = lmstudio_models(lm_url)
    if ids:
        llm_ids = [i for i in ids if "embed" not in i.lower()]
        emb_ids = [i for i in ids if "embed" in i.lower()]
        if llm_ids:
            st.success(f"Chat LLM: {llm_ids[0]}")
            pick = st.selectbox("Chat model", llm_ids, key="lm_model")
            os.environ["LMSTUDIO_MODEL"] = pick
        else:
            st.warning("No chat LLM loaded — only embeddings. Load a Gemma model in LM Studio for generative answers.")
        if emb_ids:
            st.caption(f"Embeddings (RAG retrieval): `{emb_ids[0]}` ✅")
    else:
        st.warning("LM Studio not reachable / no model loaded. In LM Studio: load a Gemma model → start server on :1234.")
        st.caption("Fallback: extractive mode (demo-safe) or set GEMMA_API_KEY.")
    st.divider()
    st.subheader("Notes")
    if st.button("📄 Load sample: Photosynthesis"):
        with open(SAMPLE_PATH) as f:
            st.session_state.raw = f.read()
        st.session_state.chunks = chunk_text(st.session_state.raw)
        st.session_state.chunk_pages = [None] * len(st.session_state.chunks)
        st.session_state.history = []
    up = st.file_uploader("Upload .txt/.md/.pdf", type=["txt", "md", "pdf"])
    if up:
        if up.name.lower().endswith(".pdf"):
            text, npages, page_texts = extract_pdf_text(up.read())
            if text:
                st.session_state.raw = text
                st.session_state.chunks, st.session_state.chunk_pages = chunk_pdf_pages(page_texts)
                st.success(f"PDF: {npages} pages → {len(st.session_state.chunks)} chunks (page-tagged)")
            else:
                st.error(f"Could not read PDF ({npages}). Try a text-based PDF or paste text.")
        else:
            st.session_state.raw = up.read().decode("utf-8", "ignore")
            st.session_state.chunks = chunk_text(st.session_state.raw)
            st.session_state.chunk_pages = [None] * len(st.session_state.chunks)
    pasted = st.text_area("Or paste notes", height=140, key="paste")
    if st.button("Use pasted text") and pasted.strip():
        st.session_state.raw = pasted
        st.session_state.chunks = chunk_text(pasted)
        st.session_state.chunk_pages = [None] * len(st.session_state.chunks)
        st.session_state.history = []
    if st.session_state.chunks:
        st.success(f"{len(st.session_state.chunks)} chunks loaded")
    if st.button("🗑 Clear notes"):
        st.session_state.chunks, st.session_state.quiz = [], []
        st.session_state.history, st.session_state.graded = [], None

if "history" not in st.session_state:
    st.session_state.history = []

chunks = st.session_state.chunks
if not chunks:
    st.info("Load the sample or paste notes to start. Demo: click **Load sample** in the sidebar.")
    st.stop()
pages = st.session_state.get("chunk_pages", [None] * len(chunks))

tab1, tab2, tab3, tab4 = st.tabs(["📖 Notes", "💡 Explain", "❓ Ask", "📝 Quiz"])

with tab1:
    for i, c in enumerate(chunks):
        tag = f" · {page_tag(pages, i)}" if page_tag(pages, i) else ""
        with st.expander(f"Chunk c{i}{tag}"):
            st.write(c)

with tab2:
    level = st.selectbox("Reading level", ["Simple", "Detailed", "Exam-cram"], key="lvl")
    if st.button("✨ Explain my notes"):
        with st.spinner("Gemma is explaining..."):
            text, mid = explain_notes(chunks, level)
        st.caption(f"`{mid}`")
        st.markdown(text)

with tab3:
    st.caption("Try: a supported Q and an unsupported Q (demo buttons below).")
    col1, col2 = st.columns(2)
    if col1.button("Supported: role of chlorophyll?"):
        st.session_state.q = "What is the role of chlorophyll?"
    if col2.button("Unsupported: Krebs ATP in muscle?"):
        st.session_state.q = "What is the Krebs cycle ATP yield in muscle?"
    q = st.text_input("Ask from your notes", key="q")
    if q:
        with st.spinner("Thinking (Gemma grounded)..."):
            r = grounded_ask(q, chunks, pages)
        st.session_state.history.append((q, r))
    for qh, r in reversed(st.session_state.history[-5:]):
        color = {"SUPPORTED": "green", "PARTIAL": "orange", "NOT_FOUND": "red"}.get(r["verdict"], "gray")
        st.markdown(f"**Q:** {qh}  ·  :{color}[{r['verdict']}] `{r.get('model','')}`")
        st.write(r["answer"])
        for e in r.get("evidence", []):
            pg = f" (📄 {e['page']})" if e.get("page") else ""
            st.caption(f"Evidence {e['chunk_id']}{pg}: “{e['quote'][:250]}…”")
        if r.get("scores"):
            st.caption("RAG retrieval: " + ", ".join(f"c{i}={s}" for i, s in r["scores"][:4]))
        st.divider()

with tab4:
    diff = st.selectbox("Difficulty", ["Easy", "Medium", "Hard"], key="diff")
    if st.button("Generate quiz (5 Qs)"):
        with st.spinner("Generating quiz..."):
            st.session_state.quiz, src = generate_quiz(chunks, diff, pages)
        st.caption(f"Quiz source: `{src}`")
        st.session_state.answers = {}
        st.session_state.graded = None
        st.session_state.qv = st.session_state.get("qv", 0) + 1  # fresh widget keys per quiz
    quiz = st.session_state.quiz
    if quiz:
        qv = st.session_state.get("qv", 0)
        ans = {}
        for idx, item in enumerate(quiz):
            pg = f" · 📄 {item['page']}" if item.get("page") else ""
            st.markdown(f"**Q{idx+1}. {item['q']}**  `{item.get('type','')}{pg}`")
            if item["type"] == "mcq":
                ans[idx] = st.radio("Pick one", item["options"], index=None, key=f"mcq{qv}_{idx}")
            else:
                ans[idx] = st.text_input("Your answer", key=f"short{qv}_{idx}")
        if st.button("Submit & grade"):
            results, score = [], 0
            for idx, item in enumerate(quiz):
                given = ans.get(idx, "")
                if item["type"] == "mcq":
                    if given is None:
                        results.append({"correct": False, "explanation": "No option selected.",
                                        "hint": "Pick one option, then submit."})
                    else:
                        ok = (given == item["answer"])
                        results.append({"correct": ok, "explanation": item["explanation"] if not ok else "Correct.",
                                        "hint": "" if ok else "Re-read the cited section."})
                else:
                    ci = item.get("chunk", 0)
                    pg = page_tag(pages, ci) if isinstance(ci, int) else None
                    hint_chunk = f"chunk c{ci} ({pg})" if pg else f"chunk c{ci}" if "chunk" in item else ""
                    results.append(grade_short(item["answer"], given or "", hint_chunk))
                score += results[-1]["correct"]
            st.session_state.graded = (score, results)
    if st.session_state.get("graded"):
        score, results = st.session_state.graded
        st.subheader(f"Score: {score}/{len(quiz)}")
        for idx, res in enumerate(results):
            icon = "✅" if res["correct"] else "❌"
            st.markdown(f"{icon} **Q{idx+1}** — {res['explanation']}")
            if not res["correct"] and res.get("hint"):
                st.info(f"Hint: {res['hint']}")
