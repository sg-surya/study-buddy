"""Optional notebook persistence: Postgres when a DB URL is configured.

- Vercel/Neon: set POSTGRES_URL (Vercel Storage injects it) -> notebooks survive cold starts.
- Local (start.bat): no env var -> original in-memory behaviour, nothing extra to install.
- psycopg imports lazily and every failure falls back to memory: storage never breaks the demo.
"""
import base64
import json
import os

DSN = (os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL")
       or os.environ.get("NEON_DATABASE_URL") or os.environ.get("POSTGRES_PRISMA_URL") or "")

_conn = None
_ready = False


def enabled() -> bool:
    return bool(DSN)


def _connect():
    global _conn, _ready
    if not DSN:
        return None
    if _conn is not None and not _conn.closed:
        return _conn
    try:
        import psycopg  # lazy: installed by requirements.txt on Vercel, optional locally
        _conn = psycopg.connect(DSN, connect_timeout=5, autocommit=True)
        _ready = False
        return _conn
    except Exception:
        _conn = None
        return None


def _run(sql, params, one=False):
    """Run a query with one reconnect+retry; returns rows/True, or None on failure."""
    global _ready
    if not DSN:
        return None
    for _ in range(2):
        c = _connect()
        if c is None:
            return None
        try:
            with c.cursor() as cur:
                if not _ready:
                    cur.execute("CREATE TABLE IF NOT EXISTS notebooks ("
                                "id text PRIMARY KEY, data jsonb NOT NULL,"
                                "updated timestamptz NOT NULL DEFAULT now())")
                    _ready = True
                cur.execute(sql, params)
                return cur.fetchone() if one else True
        except Exception:
            try:
                c.close()
            except Exception:
                pass
            _conn, _ready = None, False
    return None


def _encode(state) -> str:
    """JSON with bytes (filebytes: PDF bytes) as base64 markers."""
    def default(o):
        if isinstance(o, (bytes, bytearray)):
            return {"__b64__": base64.b64encode(bytes(o)).decode("ascii")}
        raise TypeError(f"not serializable: {type(o).__name__}")
    return json.dumps(state, default=default)


def _walk(o):
    if isinstance(o, dict):
        if len(o) == 1 and "__b64__" in o:
            return base64.b64decode(o["__b64__"])
        return {k: _walk(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_walk(v) for v in o]
    return o


def save(nid, state):
    if not DSN or not state:
        return
    _run("INSERT INTO notebooks (id, data) VALUES (%s, %s::jsonb) "
         "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated = now()",
         (nid, _encode(state)))


def _revive_state(state):
    """JSON object keys arrive as strings: filebytes {"0": ...} -> {0: (name, bytes)}."""
    fb = state.get("filebytes")
    if isinstance(fb, dict):
        fixed = {}
        for k, v in fb.items():
            try:
                fixed[int(k)] = (v[0], v[1])
            except Exception:
                pass
        state["filebytes"] = fixed
    return state


def load(nid):
    if not DSN:
        return None
    row = _run("SELECT data FROM notebooks WHERE id = %s", (nid,), one=True)
    if not row:
        return None
    try:
        raw = row[0]
        return _revive_state(_walk(json.loads(raw) if isinstance(raw, str) else raw))
    except Exception:
        return None


def delete(nid):
    _run("DELETE FROM notebooks WHERE id = %s", (nid,))
