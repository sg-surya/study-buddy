"""RAG core: chunking, PDF extract, retrieval (LM Studio embeddings -> TF-IDF)."""
import math
import os
import re
from collections import Counter

import requests

LMSTUDIO_URL = os.environ.get("LMSTUDIO_URL", "http://localhost:1234/v1")

STOPWORDS = set("""what which where when with from that this these those they them then than there their have has had were was are our your its into over under about after before between through during each every very much many most some such only also just can will would should could may might must shall upon per via within without within""".split())

GENERIC = set("""while simple generally commonly usually often known called experience experiences taken given takes makes gives goes seems shown found still already even ever always sometimes rather quite particularly various several specific basic important mainly mostly nearly almost enough though although whether whole entire single double half done make made use uses using get gets got keep kept put puts seem show shows take took come comes came go went find finds thing things way ways part parts kind kinds fact facts case cases order along across among around behind below beside beyond inside outside toward towards among""".split())


def chunk_text(text, size=700, overlap=120):
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, cur = [], ""
    for p in paras:
        if len(cur) + len(p) < size:
            cur += ("\n\n" + p if cur else p)
        else:
            if cur:
                chunks.append(cur)
            cur = (cur[-overlap:] + "\n\n" + p) if cur else p
            if len(cur) >= size:
                chunks.append(cur)
                cur = ""
    if cur:
        chunks.append(cur)
    return [c for c in chunks if c.strip()]


def extract_pdf_text(file_bytes):
    """Returns (full_text, page_count, page_texts). Never raises."""
    try:
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        parts = [(p.extract_text() or "") for p in reader.pages]
        return "\n\n".join(parts).strip(), len(reader.pages), parts
    except Exception as e:
        return "", f"pdf-error: {e}", []


def chunk_pdf_pages(page_texts, size=700):
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


def lmstudio_models(base=None):
    base = base or LMSTUDIO_URL
    try:
        r = requests.get(f"{base}/models", timeout=4)
        return [m["id"] for m in r.json().get("data", [])]
    except Exception:
        return []


def embed_lmstudio(texts, base=None):
    base = base or LMSTUDIO_URL
    ids = lmstudio_models(base)
    emb_ids = [i for i in ids if "embed" in i.lower()] or ids
    if not emb_ids:
        return None, "no-embedding-model"
    try:
        r = requests.post(f"{base}/embeddings", timeout=60,
                          json={"model": emb_ids[0], "input": texts})
        return [d["embedding"] for d in r.json()["data"]], emb_ids[0]
    except Exception as e:
        return None, f"embed-error: {e}"


def _cos(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (na * nb)


def _tokens(s):
    return re.findall(r"[a-z]{3,}", s.lower())


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


import hashlib

EMB_CACHE: dict = {}


def chunk_hash(text):
    return hashlib.md5(text.encode("utf-8", "ignore")).hexdigest()[:12]


def embed_cached(chunks, nb_id=None):
    """Chunk embeddings cached per notebook — big speedup on 40+ page PDFs."""
    if not chunks:
        return None, "empty"
    key = lambda c: (nb_id or "default", chunk_hash(c))
    missing = [c for c in chunks if key(c) not in EMB_CACHE]
    if missing:
        vecs, mid = embed_lmstudio(missing)
        if not isinstance(vecs, list) or len(vecs) != len(missing):
            return None, mid
        for c, v in zip(missing, vecs):
            EMB_CACHE[key(c)] = v
        model = mid
    else:
        ids = lmstudio_models()
        emb = [i for i in ids if "embed" in i.lower()] or ids
        model = emb[0] if emb else "cached"
    try:
        return [EMB_CACHE[key(c)] for c in chunks], model
    except KeyError:
        EMB_CACHE.clear()
        return None, "cache-miss"


def retrieve(query, chunks, k=3, nb_id=None):
    """LM Studio embeddings (cached per notebook) first, TF-IDF fallback.
    Returns (results, method) where results = [(idx, score, text)]."""
    if not chunks:
        return [], "none"
    if len(chunks) == 1:
        return [(0, 1.0, chunks[0])], "single"
    vecs, _ = embed_cached(chunks, nb_id)
    if isinstance(vecs, list) and len(vecs) == len(chunks):
        qv, _ = embed_lmstudio([query])
        if isinstance(qv, list) and len(qv) == 1:
            qv, scored = qv[0], []
            for i, cv in enumerate(vecs):
                try:
                    scored.append((i, float(_cos(qv, cv)), chunks[i]))
                except Exception:
                    pass
            if scored:
                return sorted(scored, key=lambda x: x[1], reverse=True)[:k], "embeddings"
    return retrieve_tfidf(query, chunks, k), "tfidf"


def is_header(s):
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return True
    if sum(1 for c in letters if c.isupper()) / len(letters) > 0.5:
        return True
    return bool(re.match(r"(?i)^(chapter|figure|table|unit|section|exercise|contents|index)\b", s.strip()))


def content_terms(chunks):
    all_terms = Counter(t for c in chunks for t in _tokens(c)
                        if t not in STOPWORDS and t not in GENERIC and len(t) >= 5)
    caps = set(w.lower() for w in re.findall(r"\b[A-Z][a-z]{4,}\b", "\n".join(chunks)))
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
