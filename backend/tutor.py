"""Tutor + quiz: grounded Q&A, explanations, quiz gen/grading."""
import json
import re
from collections import Counter

from llm import call_gemma
from rag import (_cos, _tokens, content_terms, embed_lmstudio, is_header,
                 page_tag, pick_keyword, retrieve)

CANNED_QUIZ = [
    {"q": "Where does photosynthesis mainly occur?", "type": "mcq",
     "options": ["Mitochondria", "Chloroplasts", "Nucleus", "Ribosomes"],
     "answer": "Chloroplasts", "explanation": "Notes: photosynthesis takes place inside chloroplasts.", "chunk": 1},
    {"q": "Which pigment captures light energy?", "type": "mcq",
     "options": ["Melanin", "Hemoglobin", "Chlorophyll", "Keratin"],
     "answer": "Chlorophyll", "explanation": "Notes: chlorophyll captures red and blue light.", "chunk": 1},
    {"q": "Where do light-dependent reactions occur?", "type": "mcq",
     "options": ["Stroma", "Thylakoid membranes", "Cytoplasm", "Cell wall"],
     "answer": "Thylakoid membranes", "explanation": "Notes: light-dependent reactions occur in thylakoid membranes.", "chunk": 2},
    {"q": "Name the two stages of photosynthesis.", "type": "short",
     "answer": "Light-dependent reactions and Calvin cycle",
     "explanation": "Notes list both stages.", "chunk": 2},
    {"q": "Name one factor affecting the rate of photosynthesis.", "type": "short",
     "answer": "Light intensity (or CO2 concentration, or temperature)",
     "explanation": "Notes: light intensity, CO2 concentration, temperature.", "chunk": 4},
]


def extractive_answer(question, chunks, pages=None, nb_id=None):
    top, method = retrieve(question, chunks, k=3, nb_id=nb_id)
    scores = [(i, round(s, 3)) for i, s, _ in top]
    if not top or top[0][1] < 0.12:
        return {"answer": "I couldn't find this in your notes. Try asking about what the notes actually cover, or add more notes.",
                "evidence": [], "verdict": "NOT_FOUND", "model": "extractive-fallback",
                "scores": scores, "retrieval": method}
    i, _, txt = top[0]
    ev = [{"chunk_id": f"c{i}", "quote": txt[:280], "page": page_tag(pages, i)}]
    return {"answer": txt[:600], "evidence": ev, "verdict": "SUPPORTED",
            "model": "extractive-fallback", "scores": scores, "retrieval": method}


def grounded_ask(question, chunks, pages=None, nb_id=None):
    top, method = retrieve(question, chunks, k=4, nb_id=nb_id)
    scores = [(i, round(s, 3)) for i, s, _ in top]
    if not top or top[0][1] < 0.12:
        return {"answer": "I couldn't find this in your notes. Ask about something the notes cover, or add notes on this topic.",
                "evidence": [], "verdict": "NOT_FOUND", "model": "extractive-fallback",
                "scores": scores, "retrieval": method}
    ctx = "\n\n".join(f"[c{i}] {t}" for i, _, t in top)
    prompt = ("You are a tutor. Answer ONLY from NOTE CHUNKS. Cite like [c0]. "
              "If absent, reply exactly: NOT_FOUND. Keep under 150 words.\n\n"
              f"NOTES:\n{ctx}\n\nQUESTION: {question}\n"
              'Reply as JSON: {"answer":"...","evidence":[{"chunk_id":"c0","quote":"..."}],"verdict":"SUPPORTED|NOT_FOUND"}')
    raw, model = call_gemma(prompt)
    if raw is None:
        r = extractive_answer(question, chunks, pages, nb_id)
        r["model"] = f"extractive-fallback ({model})"
        return r
    try:
        m = re.search(r"\{.*\}", raw, re.S)
        data = json.loads(m.group(0))
        ok_ev = []
        for e in data.get("evidence", []):
            for ci, c in enumerate(chunks):
                if e.get("quote", "")[:60] in c:
                    e["chunk_id"] = f"c{ci}"
                    e["page"] = page_tag(pages, ci)
                    ok_ev.append(e)
                    break
        # dedupe: one card per chunk, keep longest quote
        seen = {}
        for e in ok_ev:
            prev = seen.get(e["chunk_id"])
            if not prev or len(e.get("quote", "")) > len(prev.get("quote", "")):
                seen[e["chunk_id"]] = e
        data["evidence"] = list(seen.values())
        if not data["evidence"]:
            data["verdict"] = "NOT_FOUND"
            data["answer"] = "I couldn't find solid evidence in your notes for this. " + data.get("answer", "")
        data["model"] = model
        data["scores"] = scores
        data["retrieval"] = method
        return data
    except Exception:
        r = extractive_answer(question, chunks, pages, nb_id)
        r["model"] = f"{model}+extractive"
        return r


def key_sentences(chunks, per_chunk=2):
    all_tok = Counter(t for c in chunks for t in _tokens(c))
    per_chunk = max(per_chunk, -(-5 // max(len(chunks), 1)))
    out = []
    for ci, c in enumerate(chunks):
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", c) if len(s.strip().split()) >= 6]
        scored = []
        for s in sents:
            toks = [t for t in _tokens(s)]
            score = sum(1.0 / (1 + all_tok[t]) for t in set(toks)) * 100 + len(toks)
            scored.append((score, s))
        for _, s in sorted(scored, reverse=True)[:per_chunk]:
            out.append((ci, s))
    return out


def build_extractive_quiz(chunks, pages=None):
    sents = key_sentences(chunks)
    if len(sents) < 3:
        return CANNED_QUIZ, "canned"
    all_terms, caps = content_terms(chunks)
    pool = [t for t, _ in all_terms.most_common(40) if all_terms[t] >= 2]
    quiz, used = [], set()
    for ci, s in sents:
        if is_header(s):
            continue
        pg = page_tag(pages, ci)
        src = f"c{ci} ({pg})" if pg else f"c{ci}"
        if len([q for q in quiz if q["type"] == "mcq"]) < 3:
            ans = pick_keyword(s, all_terms, caps, used)
            if not ans:
                continue
            used.add(ans)
            distract = [t for t in pool if t != ans and t not in s.lower()][:3]
            while len(distract) < 3:
                distract.append("none of these")
            quiz.append({"q": f"Fill in the blank: {re.sub(re.escape(ans), '____', s, flags=re.I)[:220]}",
                         "type": "mcq", "options": sorted([ans] + distract[:3]),
                         "answer": ans, "explanation": f"From {src}: “{s[:180]}…”",
                         "chunk": ci, "page": pg})
        elif len(quiz) < 5:
            key = pick_keyword(s, all_terms, caps, used, min_freq=1) or "this section"
            quiz.append({"q": f"In your own words: what do your notes say about '{key}'?",
                         "type": "short", "answer": s[:300],
                         "explanation": f"Expected the idea of {src}: “{s[:180]}…”",
                         "chunk": ci, "page": pg})
        if len(quiz) >= 5:
            break
    return (quiz, "extractive-rag") if len(quiz) >= 3 else (CANNED_QUIZ, "canned")


def build_audio_script(chunks, pages=None, n=10):
    """Two-host audio overview script, grounded in notes. Returns [{speaker, line}]."""
    diverse = [t for _, _, t in retrieve("key concepts definitions stages factors examples", chunks, k=6)[0]]
    ctx = "\n\n".join(diverse or chunks[:6])[:3500]
    prompt = (f"Write a {n}-line podcast script where two hosts (A: curious student, B: expert tutor) "
              f"discuss these NOTES conversationally. Short spoken lines, no jargon dumps, strictly from notes.\nNOTES:\n{ctx}\n"
              'Reply ONLY as JSON list: [{"speaker":"A|B","line":"..."}]')
    raw, _ = call_gemma(prompt, "You write engaging educational podcast scripts.")
    if raw:
        try:
            m = re.search(r"\[.*\]", raw, re.S)
            items = json.loads(m.group(0))
            if len(items) >= 4:
                return [{"speaker": ("A" if str(x.get("speaker", "A")).upper().startswith("A") else "B"),
                         "line": str(x.get("line", ""))[:300]} for x in items[:14]]
        except Exception:
            pass
    out = []  # extractive fallback: keyword-driven Q&A as dialogue
    all_terms, caps = content_terms(chunks)
    used = set()
    for _, s in key_sentences(chunks, per_chunk=2)[:n]:
        if is_header(s):
            continue
        key = pick_keyword(s, all_terms, caps, used, min_freq=1) or "this topic"
        used.add(key)
        out.append({"speaker": "A", "line": f"Alright — break down '{key}' for me."})
        out.append({"speaker": "B", "line": s[:260]})
        if len(out) >= n:
            break
    return out[:n] or [{"speaker": "B", "line": "Your notes are loaded — ask me anything about them."}]


def build_flashcards(chunks, pages=None, n=12):
    """Term-definition flip cards mined from real notes. Returns [{front, back, chunk, page}]."""
    sents = [s for _, s in key_sentences(chunks, per_chunk=3) if not is_header(s)]
    if len(sents) < 3:
        return []
    all_terms, caps = content_terms(chunks)
    cards, used = [], set()
    for ci, s in enumerate(key_sentences(chunks, per_chunk=3)):
        if is_header(s[1]):
            continue
        key = pick_keyword(s[1], all_terms, caps, used)
        if not key:
            continue
        used.add(key)
        cards.append({"front": f"What is '{key}'?",
                      "back": s[1][:280], "chunk": s[0],
                      "page": page_tag(pages, s[0])})
        if len(cards) >= n:
            break
    return cards


def generate_quiz(chunks, difficulty="Easy", pages=None, nb_id=None):
    diverse = [t for _, _, t in retrieve("key concepts definitions stages factors examples", chunks, k=6, nb_id=nb_id)[0]]
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
    if level == "Briefing":
        prompt = (f"Write a 130-word overview briefing of these notes for a student who just uploaded them. "
                  f"Use 2 short paragraphs. **Bold** the 5-7 most important terms, names, or numbers. "
                  f"Only use facts from the notes.\nNOTES:\n{ctx}")
        system = "You write crisp document briefings and never invent facts beyond the notes."
    else:
        prompt = (f"Explain ONLY using these study notes (do not add facts from outside them) "
                  f"at {level} level in under 200 words with 3 key takeaways.\nNOTES:\n{ctx}")
        system = "You explain study material simply and never invent facts beyond the notes."
    raw, mid = call_gemma(prompt, system)
    if raw:
        return raw, mid
    top = " ".join(chunks[:2])[:800]
    return f"**Key points from your notes:**\n\n{top}...\n\n(Load a Gemma model in LM Studio for a full explanation — {mid}.)", "extractive-fallback"


def suggest_questions(chunks, pages=None, n=3):
    """Starter question cards for a fresh notebook. LLM first, extractive fallback."""
    diverse = [t for _, _, t in retrieve("key concepts definitions stages factors examples", chunks, k=6)[0]]
    ctx = "\n\n".join(diverse or chunks[:6])[:3000]
    prompt = (f"Suggest {n} short study questions a student should ask about these NOTES. "
              f"Each under 15 words, answerable from the notes, spread across topics.\nNOTES:\n{ctx}\n"
              'Reply ONLY as JSON list: ["q1", "q2", "q3"]')
    raw, _ = call_gemma(prompt, "You suggest study questions.")
    if raw:
        try:
            m = re.search(r"\[.*\]", raw, re.S)
            items = [str(x)[:140] for x in json.loads(m.group(0))]
            if len(items) >= 2:
                return items[:n]
        except Exception:
            pass
    out = []
    for ci, s in key_sentences(chunks):
        if is_header(s):
            continue
        toks = [t for t in _tokens(s) if len(t) >= 6][:3]
        if toks:
            out.append(f"What do my notes say about '{max(toks, key=len)}'?")
        if len(out) >= n:
            break
    return out or ["What are the key points in my notes?",
                   "Summarize the most important section?",
                   "What should I revise first?"]


def grade_short(expected, given, chunk_hint=""):
    if not (given or "").strip():
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
    sim = 0.0
    vecs, _ = embed_lmstudio([expected, given or ""])
    if isinstance(vecs, list) and len(vecs) == 2:
        try:
            sim = _cos(vecs[0], vecs[1])
            hit, partial = sim >= 0.72, 0.55 <= sim < 0.72
        except Exception:
            hit, partial = False, False
    else:
        exp_keys = set(re.findall(r"[A-Za-z]{4,}", expected.lower()))
        overlap = sum(1 for w in exp_keys if w in (given or "").lower()) / max(len(exp_keys), 1)
        sim, hit, partial = overlap, overlap >= 0.5, 0.25 <= overlap < 0.5
    if hit:
        return {"correct": True, "explanation": f"Correct (similarity {sim:.2f}).", "hint": ""}
    if partial:
        return {"correct": False,
                "explanation": f"Partly right (similarity {sim:.2f}) — missing key terms. Expected: {expected[:160]}.",
                "hint": f"Re-read {chunk_hint} and include the exact key terms." if chunk_hint else "Add the exact key terms from your notes."}
    return {"correct": False,
            "explanation": f"Not quite (similarity {sim:.2f}). Expected something like: {expected[:200]}",
            "hint": f"Re-read {chunk_hint}." if chunk_hint else "Re-read the cited chunk."}


def grade_mcq(item, given):
    if given is None:
        return {"correct": False, "explanation": "No option selected.", "hint": "Pick one option, then submit."}
    ok = (given == item["answer"])
    return {"correct": ok, "explanation": "Correct." if ok else item.get("explanation", "Incorrect."),
            "hint": "" if ok else "Re-read the cited section."}
