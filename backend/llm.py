"""LLM clients: LM Studio (primary) -> Google AI Studio (fallback)."""
import os
import time

import requests

from rag import LMSTUDIO_URL, lmstudio_models

GOOGLE_MODEL = os.environ.get("GEMMA_MODEL", "gemma-3-27b-it")


def call_lmstudio(prompt, system="You are a helpful tutor.", model=None, base=None):
    """Returns (text, model_id) or (None, reason)."""
    base = base or LMSTUDIO_URL
    model = model or os.environ.get("LMSTUDIO_MODEL", "")
    if not model:
        ids = lmstudio_models(base)
        llm_ids = [i for i in ids if "embed" not in i.lower()]
        model = (llm_ids or ids or [""])[0] if ids else ""
    if not model:
        return None, "lmstudio-no-model (load Gemma in LM Studio first)"
    try:
        t0 = time.time()
        r = requests.post(f"{base}/chat/completions", timeout=120, json={
            "model": model, "temperature": 0.3,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": prompt}]})
        return r.json()["choices"][0]["message"]["content"], f"lmstudio:{model} ({time.time()-t0:.1f}s)"
    except Exception as e:
        return None, f"lmstudio-error: {e}"


def call_gemma(prompt, system="You are a helpful tutor."):
    """Provider order: LM Studio -> Google AI Studio -> None."""
    raw, mid = call_lmstudio(prompt, system)
    if raw:
        return raw, mid
    lm_reason = mid
    key = os.environ.get("GEMMA_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
    if not key:
        return None, f"{lm_reason} + google-no-key"
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        t0 = time.time()
        resp = genai.GenerativeModel(GOOGLE_MODEL).generate_content(system + "\n\n" + prompt)
        return resp.text, f"google:{GOOGLE_MODEL} ({time.time()-t0:.1f}s)"
    except Exception as e:
        return None, f"{lm_reason} + google-error: {e}"
