import { ArrowRight, BookMarked, Bookmark, BookOpenText, Bot, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, CornerDownLeft, FileText, Headphones, Layers, Lightbulb, ListChecks, Loader2, Maximize2, MessageCircleQuestion, Minus, Moon, MoreVertical, Paperclip, Pencil, Pin, Plus, Search, SendHorizontal, Share2, Shuffle, Sparkles, Square, Sun, ThumbsDown, ThumbsUp, Trash2, Upload, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api, API_BASE, type ChunkInfo, type NotesSummary } from "./api";
import { citeWrap } from "./components/AskTab";
import ReactMarkdown from "react-markdown";
import AudioTab from "./components/AudioTab";
import ExplainTab from "./components/ExplainTab";
import QuizTab from "./components/QuizTab";
import { appendMsg, deleteNotebook, loadConvos, newNotebook, refreshMeta, renameNotebook, type Convo } from "./store";

type Tab = "ask" | "explain" | "quiz" | "cards" | "audio";

/* ================= upload transition: horizontal strips wipe once into notebook ================= */
function UploadTransition({ name }: { name: string }) {
  const rows = ["bg-brand", "bg-brand", "bg-stone-950", "bg-brand", "bg-amber-500"];
  return (
    <div className="transition-exit fixed inset-0 z-[60] bg-stone-950 text-white flex flex-col overflow-hidden">
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {rows.map((c, i) => (
          <div key={i} className={`strip-row flex-1 ${c}`} style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      <div className="rise-in relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ animationDelay: "0.35s" }}>
        <div className="font-display text-2xl tracking-wide">SC<span className="text-brand">.</span></div>
        <div className="mt-2 text-sm font-bold tracking-widest">NOTEBOOK READY</div>
        <div className="mt-1 text-xs text-white/70 truncate max-w-xs">{name}</div>
      </div>
    </div>
  );
}
/* ================= create-notebook modal: white, sharp edges, orange cutouts ================= */
function CreateModal({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const [mTab, setMTab] = useState<"upload" | "paste" | "link">("upload");
  const [drag, setDrag] = useState(false);
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [paste, setPaste] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [leaving, setLeaving] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && !busy && !leaving && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, busy, leaving]);

  function suggestName(f: File | undefined) {
    if (name.trim() || !f) return;
    setName(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 60));
  }

  function addFiles(list: FileList | undefined) {
    if (!list) return;
    const picked = [...list].filter((f) => /\.(pdf|txt|md)$/i.test(f.name));
    if (!picked.length) { setErr("Only PDF, TXT or MD files."); return; }
    setErr("");
    setFiles((p) => [...p, ...picked].slice(0, 5));
    suggestName(picked[0]);
  }

  const ready = name.trim().length > 0 &&
    (files.length > 0 || paste.trim().length > 0 || url.trim().length > 0);

  async function create() {
    if (!ready || busy) return;
    setBusy(true); setErr("");
    const t0 = performance.now();
    const nid = crypto.randomUUID().slice(0, 8);
    try {
      let sum: NotesSummary | null = null;
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1}/${files.length}…`);
        const r = await api.upload(files[i], nid);
        if ((r as any).error) throw new Error((r as any).error);
        sum = r;
      }
      if (paste.trim()) {
        setProgress("Adding pasted notes…");
        const r = await api.text(paste, nid);
        if ((r as any).error) throw new Error((r as any).error);
        sum = r;
      }
      if (url.trim()) {
        setProgress("Fetching link…");
        const r = await api.url(url.trim(), nid);
        if ((r as any).error) throw new Error((r as any).error);
        sum = r;
      }
      if (!sum) {
        const r = await api.sample(nid);
        sum = r;
      }
      const secs = (performance.now() - t0) / 1000;
      newNotebook(nid, sum.source,
        { name: sum.file, size: sum.size, pages: sum.pages.length, chunks: sum.chunks, secs },
        name.trim());
      setLeaving(name.trim());
      setTimeout(() => { onClose(); nav(`/notebook/${nid}`); }, 1650);
    } catch (e: any) {
      setBusy(false); setProgress("");
      setErr(e?.message || "Failed — is the backend running (start.bat)?");
    }
  }

  /* single entry: create() validates name + source, then builds the notebook */

  return (
    <>
    {leaving && <UploadTransition name={leaving} />}
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-stone-950/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white w-full max-w-lg rounded-none shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <span className="absolute -top-2 -left-2 w-6 h-6 bg-brand" />
        <span className="absolute -top-2 -right-2 w-6 h-6 bg-brand" />
        <span className="absolute -bottom-2 -left-2 w-6 h-6 bg-brand" />
        <span className="absolute -bottom-2 -right-2 w-6 h-6 bg-brand" />
        <div className="px-6 pt-5">
          <div className="font-display text-2xl tracking-wide">CREATE NOTEBOOK</div>
          <div className="text-[13px] text-stone-500 mt-0.5">Add your notes and start learning with Meeko.</div>
          <button onClick={onClose} aria-label="close" className="absolute top-4 right-4 p-2 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <div className="p-6 pt-4">
          <label className="block text-xs font-bold tracking-widest text-stone-500">NOTEBOOK NAME</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operating Systems"
            className="mt-1.5 w-full border border-stone-300 px-4 py-3 text-[15px] outline-none focus:border-brand rounded-none placeholder:text-stone-400" />

          <div className="flex gap-2 mt-4">
            {(["upload", "paste", "link"] as const).map((t) => (
              <button key={t} onClick={() => setMTab(t)}
                className={`flex-1 py-2.5 text-[13px] font-bold border transition ${mTab === t ? "bg-stone-950 text-white border-stone-950" : "border-stone-200 hover:border-stone-400"}`}>
                {t === "upload" ? "Upload" : t === "paste" ? "Paste" : "Link"}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {mTab === "upload" && (
              <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed p-6 text-center cursor-pointer transition ${drag ? "border-brand bg-brandsoft" : "border-stone-300 hover:border-brand"}`}>
                <input ref={fileRef} type="file" accept=".pdf,.txt,.md" multiple className="hidden"
                  onChange={(e) => { addFiles(e.target.files ?? undefined); e.target.value = ""; }} />
                <UploadCloud size={24} className="mx-auto text-brand" />
                <div className="font-bold text-sm mt-1.5">Drop files or browse</div>
                <div className="text-[11px] text-stone-500 mt-0.5">PDF, TXT, MD</div>
              </div>
            )}
            {mTab === "paste" && (
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} placeholder="Paste your notes here…"
                className="w-full text-sm border border-stone-300 p-3 outline-none focus:border-brand rounded-none" />
            )}
            {mTab === "link" && (
              <div className="flex gap-2">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… article or docs page"
                  className="flex-1 min-w-0 text-sm border border-stone-300 px-4 py-3 outline-none focus:border-brand rounded-none placeholder:text-stone-400" />
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-[13px] bg-stone-50 border border-stone-200 px-3 py-1.5">
                  <FileText size={13} className="text-brand shrink-0" />
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-stone-400 text-[11px]">{(f.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label="remove"
                    className="p-1 hover:text-red-600"><X size={13} /></button>
                </div>
              ))}
            </div>
          )}

          {err && <div className="mt-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 p-2.5">{err}</div>}

          <button disabled={!ready || busy} onClick={create}
            className="mt-4 w-full py-3.5 bg-brand text-white font-display text-lg tracking-wide hover:bg-stone-950 transition disabled:opacity-40 flex items-center justify-center gap-2 rounded-none">
            {busy ? <><Loader2 size={18} className="animate-spin" /> {progress || "Working…"} </> : <>Create Notebook <ArrowRight size={18} /></>}
          </button>
          {!ready && !busy && (
            <div className="mt-2 text-[11px] text-stone-400 text-center">
              {!name.trim() ? "Give your notebook a name" : "Add at least one source to start studying"}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

/* ================= shared source panel ================= */
function SourcePanel({ index, cited, flashId, refs, bare }: {
  index: ChunkInfo[]; cited: string[]; flashId: string | null;
  refs: React.MutableRefObject<Record<string, HTMLDivElement | null>>; bare?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const citedSet = new Set(cited);
  const citedItems = index.filter((c) => citedSet.has(c.id));
  const rest = index.filter((c) => !citedSet.has(c.id) &&
    (!q.trim() || (c.preview + c.id).toLowerCase().includes(q.toLowerCase())));
  return (
    <aside id="source-panel" className={`border border-stone-200 bg-white shadow-sm p-4 ${bare ? "" : "lg:sticky lg:top-4 max-h-[75vh] overflow-auto"}`}>
      <h2 className="text-sm font-extrabold mb-1 flex items-center gap-1.5">
        <BookMarked size={15} className="text-brand" /> Sources
        <span className="font-normal text-stone-400">· {citedItems.length} cited · {index.length} total</span>
      </h2>
      {citedItems.length > 0 && (
        <div className="space-y-2 mt-2">
          {citedItems.map((c) => (
            <div key={c.id} ref={(el) => { refs.current[c.id] = el; }}
              className={`border p-2.5 text-[13px] transition ${flashId === c.id ? "evidence-flash border-brand" : "border-brandline bg-brandsoft/60"}`}>
              <div className="text-[11px] font-bold text-branddark mb-0.5">{c.id}{c.page ? ` · ${c.page}` : ""}</div>
              <div className="text-stone-600">{c.preview}…</div>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)}
        className="mt-3 w-full text-xs font-bold px-3 py-2 bg-stone-100 hover:bg-stone-200 transition flex items-center justify-center gap-1">
        {open ? "Hide" : "Show"} all {index.length} chunks <ChevronDown size={14} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <>
          <div className="relative mt-2">
            <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter chunks…"
              className="w-full text-sm bg-stone-50 border border-stone-200 pl-9 pr-3 py-2 outline-none focus:border-brand rounded-none" />
          </div>
          <div className="space-y-2 mt-2">
            {rest.slice(0, 60).map((c) => (
              <div key={c.id} ref={(el) => { refs.current[c.id] = el; }}
                className={`border p-2.5 text-[13px] transition ${flashId === c.id ? "evidence-flash border-brand" : "border-stone-100 bg-stone-50/60"}`}>
                <div className="text-[11px] font-bold text-stone-500 mb-0.5">{c.id}{c.page ? ` · ${c.page}` : ""}</div>
                <div className="text-stone-600">{c.preview}…</div>
              </div>
            ))}
            {rest.length > 60 && <div className="text-[11px] text-stone-400">+{rest.length - 60} more — refine the filter</div>}
          </div>
        </>
      )}
    </aside>
  );
}

/* ================= flashcards ================= */
function FlashcardsTab({ nb, files }: { nb: string; files?: number[] | null }) {
  const [cards, setCards] = useState<{ front: string; back: string; chunk?: number; page?: string | null }[]>([]);
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    api.flashcards(nb, files ?? undefined).then((r) => {
      if ((r as any).error) setErr((r as any).error);
      else { setCards(r.cards); setIdx(0); setFlip(false); }
    }).catch(() => setErr("Backend unreachable."));
  }, [nb]);
  if (err) return <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4">{err}</div>;
  if (!cards.length) return <div className="text-sm text-stone-500 animate-pulse">Making flashcards from your notes…</div>;
  const c = cards[idx];
  function go(d: number) {
    setFlip(false);
    setTimeout(() => setIdx((i) => (i + d + cards.length) % cards.length), 120);
  }
  return (
    <div className="max-w-xl mx-auto">
      <div className="text-xs font-bold text-stone-400 tracking-widest text-center">{idx + 1} / {cards.length}</div>
      <div className="mt-2 [perspective:1200px]">
        <button onClick={() => setFlip((f) => !f)}
          className={`flip-inner relative w-full min-h-56 text-left border bg-white shadow-sm p-6 ${flip ? "flipped border-brand" : "border-stone-200"}`}>
          <div className={`flip-face ${flip ? "hidden" : ""}`}>
            <div className="text-[11px] font-bold text-branddark tracking-widest">TERM</div>
            <div className="text-xl font-bold mt-2">{c.front}</div>
            <div className="text-xs text-stone-400 mt-4">Click to flip</div>
          </div>
          <div className={`flip-face flip-back absolute inset-0 p-6 bg-brandsoft ${flip ? "" : "hidden"}`}>
            <div className="text-[11px] font-bold text-branddark tracking-widest">DEFINITION {c.page ? `· ${c.page}` : ""}</div>
            <div className="text-[15px] mt-2 text-stone-800">{c.back}</div>
          </div>
        </button>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button onClick={() => go(-1)} className="px-4 py-2 border border-stone-200 bg-white text-sm font-bold hover:border-brand" aria-label="previous"><ChevronLeft size={16} /></button>
        <button onClick={() => { const o = [...cards].sort(() => Math.random() - 0.5); setCards(o); setIdx(0); setFlip(false); }}
          className="px-4 py-2 border border-stone-200 bg-white text-sm font-bold hover:border-brand flex items-center gap-1.5"><Shuffle size={14} /> Shuffle</button>
        <button onClick={() => go(1)} className="px-4 py-2 bg-stone-950 text-white text-sm font-bold hover:bg-brand" aria-label="next"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

/* ================= top navbar (notebook screens) ================= */
function Navbar({ onSearch, theme, setTheme }: {
  onSearch: () => void; theme: string; setTheme: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); onSearch(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onSearch]);
  return (
    <header className="border-b border-stone-200 bg-cream/90 backdrop-blur px-3 sm:px-5 h-16 flex items-center gap-3 sticky top-0 z-30">
      <Link to="/" className="font-display text-2xl tracking-wide shrink-0">
        meeko<span className="text-brand">.</span>
      </Link>
      <button onClick={onSearch}
        className="hidden sm:flex flex-1 max-w-xl mx-auto items-center gap-2 bg-white border border-stone-200 px-4 py-2 text-sm text-stone-400 hover:border-brand transition">
        <Search size={15} /> Search in this notebook…
        <span className="ml-auto hidden md:flex items-center gap-1 text-[11px] font-mono2">
          <kbd className="border border-stone-200 px-1.5 py-0.5 bg-stone-50">Ctrl</kbd>
          <kbd className="border border-stone-200 px-1.5 py-0.5 bg-stone-50">K</kbd>
        </span>
      </button>
      <button onClick={onSearch} aria-label="search" className="sm:hidden p-2 hover:bg-stone-100 ml-auto"><Search size={18} /></button>
      <div className="ml-auto sm:ml-0 flex items-center gap-1.5">
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="theme"
          className="p-2 hover:bg-stone-100">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        <div className="relative">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 p-1 hover:bg-stone-100">
            <span className="w-8 h-8 bg-amber-800 text-white text-sm font-bold grid place-items-center rounded-full">S</span>
            <span className="hidden md:inline text-sm font-bold">Surya</span>
            <ChevronDown size={14} className="text-stone-500" />
          </button>
          {open && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-stone-200 shadow-xl z-40">
              <Link to="/" onClick={() => setOpen(false)} className="block text-sm px-4 py-2.5 hover:bg-stone-50">New notebook</Link>
              <Link to="/" onClick={() => setOpen(false)} className="block text-sm px-4 py-2.5 hover:bg-stone-50">All notebooks</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ================= in-notebook search overlay ================= */
function SearchOverlay({ index, onPick, onClose }: {
  index: ChunkInfo[]; onPick: (id: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const hits = q.trim()
    ? index.filter((c) => (c.preview + c.id).toLowerCase().includes(q.toLowerCase())).slice(0, 12)
    : [];
  return (
    <div className="fixed inset-0 z-50 bg-stone-950/50 p-4 flex justify-center" onClick={onClose}>
      <div className="w-full max-w-xl h-fit mt-20 bg-white border border-stone-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 border-b border-stone-100">
          <Search size={16} className="text-stone-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search in this notebook…" className="flex-1 py-3.5 outline-none text-[15px]" />
          <kbd className="text-[10px] font-mono2 border border-stone-200 px-1.5 py-0.5 text-stone-400">ESC</kbd>
        </div>
        {hits.map((c) => (
          <button key={c.id} onClick={() => { onPick(c.id); onClose(); }}
            className="w-full text-left px-4 py-2.5 hover:bg-brandsoft border-b border-stone-100 flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-brand shrink-0" />
            <span className="text-[11px] font-bold text-branddark shrink-0">{c.id}{c.page ? ` · ${c.page}` : ""}</span>
            <span className="text-[13px] text-stone-600 truncate">{c.preview}…</span>
          </button>
        ))}
        {q.trim() && hits.length === 0 && <div className="px-4 py-6 text-sm text-stone-400 text-center">No matches in these notes.</div>}
      </div>
    </div>
  );
}

function allPagesText(sum: NotesSummary | null) {
  if (!sum) return "";
  const pdfPages = (sum.files ?? []).filter((f) => /\.pdf$/i.test(f.name)).reduce((a, f) => a + (f.pages || 0), 0);
  if (pdfPages > 0) return `${pdfPages} pages`;
  return `${sum.chunks} chunks`;
}

/* ================= notebook page: /notebook/:id ================= */
function Notebook({ health, theme }: { health: { chat_model: string | null; embed_model: string | null } | null; theme: string }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [sum, setSum] = useState<NotesSummary | null>(null);
  const [convo, setConvo] = useState<Convo | null>(null);
  const [tab, setTab] = useState<Tab>("ask");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; page: string | null; text: string; file?: number | null; quote?: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [votes, setVotes] = useState<Record<number, 1 | -1>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [status, setStatus] = useState<"ready" | "processing" | "failed">("ready");
  const [failMsg, setFailMsg] = useState("");
  const [mView, setMView] = useState<"chat" | "viewer">("chat");
  const [vTab, setVTab] = useState<"docs" | "notes" | "highlights">("docs");
  const [vFile, setVFile] = useState(0);
  const [vPage, setVPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [myNotes, setMyNotes] = useState<{ t: string; ts: number }[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [selFiles, setSelFiles] = useState<number[] | null>(null); // null = all sources
  const [brief, setBrief] = useState<{ text: string; model: string } | null>(null);
  const [suggest, setSuggest] = useState<string[]>([]);
  const [briefVote, setBriefVote] = useState<1 | -1 | null>(null);
  const [highlights, setHighlights] = useState<{ chunk: string; page: string | null; quote: string; file?: number | null }[]>([]);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const moreRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const viewerBox = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    api.summary(id).then(setSum).catch(() => setSum(null));
    const c = loadConvos().find((x) => x.id === id) ?? null;
    setConvo(c);
    try {
      setMyNotes(JSON.parse(localStorage.getItem(`sc-notes-${id}`) || "[]"));
      setHighlights(JSON.parse(localStorage.getItem(`sc-hl-${id}`) || "[]"));
      const cached = localStorage.getItem(`sc-brief-${id}`);
      if (cached) {
        const b = JSON.parse(cached);
        setBrief(b.brief); setSuggest(b.suggest || []);
      }
    } catch { /* noop */ }
  }, [id]);

  /* auto-briefing: one overview per notebook, cached */
  useEffect(() => {
    if (!id || !sum || brief) return;
    let live = true;
    (async () => {
      try {
        const [b, s] = await Promise.all([
          api.explain("Briefing", id).catch(() => null),
          api.suggest(id).catch(() => null),
        ]);
        if (!live) return;
        const bb = b && !(b as any).error ? { text: (b as any).text, model: (b as any).model } : null;
        const ss = s && !(s as any).error ? (s as any).questions : [];
        if (bb) setBrief(bb);
        if (ss.length) setSuggest(ss);
        try { localStorage.setItem(`sc-brief-${id}`, JSON.stringify({ brief: bb, suggest: ss })); } catch { /* noop */ }
      } catch { /* noop */ }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sum]);

  function persistNotes(n: { t: string; ts: number }[]) {
    setMyNotes(n);
    try { localStorage.setItem(`sc-notes-${id}`, JSON.stringify(n)); } catch { /* noop */ }
  }
  function persistHl(h: { chunk: string; page: string | null; quote: string; file?: number | null }[]) {
    setHighlights(h);
    try { localStorage.setItem(`sc-hl-${id}`, JSON.stringify(h)); } catch { /* noop */ }
  }
  function toggleHl(chunk: string, page: string | null, quote: string, file?: number | null) {
    persistHl(highlights.some((h) => h.chunk === chunk)
      ? highlights.filter((h) => h.chunk !== chunk)
      : [...highlights, { chunk, page, quote: quote.slice(0, 220), file }]);
  }

  function toggleFile(fi: number) {
    const all = (sum?.files ?? []).map((f) => f.idx);
    const cur = selFiles ?? all;
    if (cur.includes(fi)) {
      if (cur.length === 1) return; // keep at least one source on
      setSelFiles(cur.filter((x) => x !== fi));
    } else {
      setSelFiles([...cur, fi]);
    }
  }
  function isOn(fi: number) {
    return selFiles ? selFiles.includes(fi) : true;
  }

  async function send(question: string) {
    if (!question.trim() || busy || !id) return;
    setBusy(true);
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      const r = await api.ask(question, id, ctl.signal, selFiles);
      setConvo((c) => (c ? { ...c, messages: [...c.messages, { q: question, r }] } : c));
      appendMsg(id, { q: question, r });
      setQ("");
    } catch (e: any) {
      if (e?.name !== "AbortError") { /* backend down: stay silent, busy clears */ }
    }
    abortRef.current = null;
    setBusy(false);
  }
  function stop() { abortRef.current?.abort(); }

  async function summarize() {
    if (busy || !id) return;
    setBusy(true);
    try {
      const r = await api.explain("Detailed", id);
      const msg = { q: "Summarize this chapter", r: { answer: r.text, evidence: [], verdict: "SUPPORTED" as const, model: r.model } };
      setConvo((c) => (c ? { ...c, messages: [...c.messages, msg] } : c));
      appendMsg(id, msg);
    } catch { /* noop */ }
    setBusy(false);
  }

  async function uploadMore(list: FileList | undefined) {
    if (!list || !id) return;
    const picked = [...list].filter((f) => /\.(pdf|txt|md)$/i.test(f.name)).slice(0, 5);
    if (!picked.length) return;
    setStatus("processing");
    try {
      let s: NotesSummary | null = null;
      for (const f of picked) s = await api.upload(f, id);
      if (s) {
        setSum(s);
        const meta = { name: s.file, size: s.size, pages: s.pages.length, chunks: s.chunks, secs: convo?.file?.secs ?? 0 };
        refreshMeta(id, meta, s.source);
        setConvo((c) => (c ? { ...c, file: meta, source: s!.source } : c));
        setStatus("ready");
      }
    } catch {
      setStatus("failed");
      setFailMsg("Upload failed — check the backend, then retry.");
    }
  }

  function jump(chunkId: string, quote?: string) {
    const entry = sum?.index.find((c) => c.id === chunkId);
    if (entry && entry.file !== undefined && entry.file !== null) {
      setVFile(entry.file);
      const m = entry.page?.match(/p\.(\d+)/);
      setVPage(m ? parseInt(m[1]) : 1);
    }
    if (quote) setPreview((p) => ({ id: chunkId, page: entry?.page ?? p?.page ?? null, text: p?.text ?? "", file: entry?.file ?? p?.file, quote }));
    setFlashId(chunkId);
    if (id) api.chunk(id, chunkId).then((p) => setPreview((prev) => ({ id: p.id, page: p.page, text: p.text, file: (p as any).file ?? prev?.file, quote: prev?.quote }))).catch(() => {});
    setTimeout(() => refs.current[chunkId]?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    setTimeout(() => setFlashId(null), 2400);
  }

  function copy(i: number, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  function fileName(fi?: number | null) {
    if (fi === undefined || fi === null || !sum) return "";
    return sum.files?.[fi]?.name ?? "";
  }

  function fileNameOf(e: { file?: number | null }): string {
    return fileName(e.file ?? undefined);
  }

  if (!convo) return <div className="p-10 text-center text-stone-500">Notebook not found. <Link to="/" className="underline font-bold">Home</Link></div>;
  const cited = [...new Set(convo.messages.flatMap((m) => m.r.evidence.map((e) => e.chunk_id)))];
  const pdfFiles = (sum?.files ?? []).filter((f) => /\.pdf$/i.test(f.name));
  const curFile = sum?.files?.[vFile];
  const maxPage = curFile && curFile.pages > 0 ? curFile.pages : Math.max(...(sum?.pages ?? [1]), 1);
  const fileUrl = id && curFile && /\.pdf$/i.test(curFile.name)
    ? `${API_BASE}/api/files/${id}/${curFile.idx ?? 0}#page=${Math.min(Math.max(vPage, 1), maxPage)}`
    : null;

  const chips: { label: string; run: () => void }[] = [
    { label: "Summarize this chapter", run: summarize },
    { label: "Give key points", run: () => send("Give me the key points from my notes") },
    { label: "Explain simply", run: () => send("Explain the toughest topic in my notes simply") },
    { label: "Make a quiz from this", run: () => setTab("quiz") },
  ];

  return (
    <div className="min-h-full bg-cream">
      <Navbar onSearch={() => setSearchOpen(true)} theme={theme} setTheme={(t) => {
        try { localStorage.setItem("sc-theme", t); } catch { /* noop */ }
        document.documentElement.classList.toggle("dark", t === "dark");
        (window as any).__setTheme?.(t);
      }} />
      {searchOpen && sum && (
        <SearchOverlay index={sum.index} onPick={(cid) => { setMView("chat"); jump(cid); }} onClose={() => setSearchOpen(false)} />
      )}

      {/* notebook header */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5 pt-4 flex items-start gap-3 flex-wrap">
        <span className="w-11 h-11 bg-brand text-white grid place-items-center shrink-0 rounded-xl"><BookOpenText size={20} /></span>
        <div className="min-w-0">
          {editing ? (
            <input autoFocus defaultValue={convo.title} maxLength={60}
              onBlur={(e) => { const t = e.target.value.trim(); if (t) { renameNotebook(convo.id, t); setConvo({ ...convo, title: t }); } setEditing(false); }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="font-bold text-lg border border-brand px-2 py-0.5 outline-none w-full max-w-72" />
          ) : (
            <div className="font-bold text-lg truncate flex items-center gap-1.5">
              {convo.title}
              <button onClick={() => setEditing(true)} aria-label="rename" className="p-1 text-stone-400 hover:text-brand"><Pencil size={13} /></button>
            </div>
          )}
          <div className="text-xs text-stone-500 truncate">
            {(sum?.files.length ?? 0)} file{(sum?.files.length ?? 0) === 1 ? "" : "s"} · {allPagesText(sum)} · Updated {new Date(convo.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {status === "ready" && (
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 border rounded-full ${health?.chat_model ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              <span className={`w-2 h-2 rounded-full ${health?.chat_model ? "bg-emerald-500" : "bg-amber-500"}`} />
              {health?.chat_model ? "Ready" : "Ready · no LLM"}
            </span>
          )}
          {status === "processing" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-brandsoft text-branddark border border-brandline rounded-full">
              <Loader2 size={13} className="animate-spin" /> Processing
            </span>
          )}
          {status === "failed" && (
            <button onClick={() => moreRef.current?.click()} title={failMsg}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-full hover:bg-red-100">
              Failed — retry
            </button>
          )}
          <input ref={moreRef} type="file" accept=".pdf,.txt,.md" multiple className="hidden"
            onChange={(e) => { uploadMore(e.target.files ?? undefined); e.target.value = ""; }} />
          <Link to="/" title="create notebook"
            className="text-xs font-bold px-3 py-2 hover:bg-stone-100 hidden md:flex items-center gap-1.5">
            <Plus size={14} /> Create notebook
          </Link>
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href).catch(() => {}); setCopied(-2); setTimeout(() => setCopied(null), 1500); }}
            title="copy link"
            className="text-xs font-bold px-3 py-2 hover:bg-stone-100 hidden md:flex items-center gap-1.5">
            {copied === -2 ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />} Share
          </button>
          <button onClick={() => moreRef.current?.click()}
            className="text-xs font-bold px-3 sm:px-4 py-2 border border-brand text-brand hover:bg-brand hover:text-white transition flex items-center gap-1.5 rounded-lg">
            <Upload size={14} /> <span className="hidden sm:inline">Upload More</span>
          </button>
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} aria-label="menu" className="p-2 border border-stone-200 hover:border-brand rounded-lg"><MoreVertical size={16} /></button>
            {menu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-stone-200 shadow-xl z-20">
                <button onClick={() => { setEditing(true); setMenu(false); }} className="w-full text-left text-sm px-4 py-2.5 hover:bg-stone-50">Rename</button>
                <button onClick={async () => {
                  if (id) { try { await api.clear(id); } catch { /* noop */ } deleteNotebook(id); }
                  nav("/");
                }} className="w-full text-left text-sm px-4 py-2.5 hover:bg-red-50 text-red-700">Delete notebook</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* mobile view switch */}
      <div className="lg:hidden max-w-[1400px] mx-auto px-3 mt-3 grid grid-cols-2 gap-2">
        {(["chat", "viewer"] as const).map((v) => (
          <button key={v} onClick={() => setMView(v)}
            className={`py-2 text-sm font-bold border ${mView === v ? "bg-stone-950 text-white border-stone-950" : "bg-white border-stone-200"}`}>
            {v === "chat" ? "Chat" : "Documents"}
          </button>
        ))}
      </div>

      <div className="max-w-[1400px] mx-auto px-3 sm:px-5 py-4 grid lg:grid-cols-[62%_38%] gap-5 items-start">
        {/* left: chat */}
        <div className={`min-w-0 ${mView === "chat" ? "" : "hidden lg:block"}`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {([
              { id: "ask", icon: <MessageCircleQuestion size={17} />, t: "Ask", d: "Chat with your notes", run: () => { setTab("ask"); inputRef.current?.focus(); } },
              { id: "explain", icon: <Lightbulb size={17} />, t: "Summarize", d: "Grounded summary", run: summarize },
              { id: "quiz", icon: <ListChecks size={17} />, t: "Quiz", d: "Practice questions", run: () => setTab("quiz") },
              { id: "cards", icon: <Layers size={17} />, t: "Flashcards", d: "Revision cards", run: () => setTab("cards") },
              { id: "audio", icon: <Headphones size={17} />, t: "Audio", d: "Two-host overview", run: () => setTab("audio") },
            ] as { id: Tab; icon: React.ReactNode; t: string; d: string; run: () => void }[]).map((a) => (
              <button key={a.id} onClick={a.run}
                className={`text-left bg-white border p-3 hover:-translate-y-0.5 transition shadow-sm rounded-xl ${(tab === a.id || (a.id === "ask" && tab === "ask")) && (a.id === tab) ? "border-brand bg-brandsoft" : "border-stone-200 hover:border-brand"}`}>
                <span className="text-brand">{a.icon}</span>
                <span className="block font-bold text-sm mt-1.5">{a.t}</span>
                <span className="hidden sm:block text-[11px] text-stone-500">{a.d}</span>
              </button>
            ))}
          </div>

          {tab === "ask" && (
            <div>
              {/* briefing */}
              <div className="border border-stone-200 bg-white shadow-sm p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 grid place-items-center bg-brand text-white font-display text-sm shrink-0">M</span>
                  <div className="min-w-0">
                    <div className="font-bold text-lg leading-tight truncate">{convo.title}</div>
                    <div className="text-[11px] text-stone-500">
                      {(sum?.files.length ?? 0)} source{(sum?.files.length ?? 0) === 1 ? "" : "s"} · {new Date(convo.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
                {!brief ? (
                  <div className="text-sm text-stone-500 mt-4 animate-pulse">Meeko is reading your document…</div>
                ) : (
                  <>
                    <div className="md-body text-[14.5px] mt-3 text-stone-800">
                      <ReactMarkdown>{brief.text}</ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <button onClick={() => persistNotes([{ t: brief.text.slice(0, 500), ts: Date.now() }, ...myNotes])}
                        title="save to note" className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 hover:bg-brandsoft text-stone-600 hover:text-branddark">
                        <Pin size={13} /> Save to note
                      </button>
                      <button onClick={() => copy(-1, brief.text)} title="copy" className="p-1.5 text-stone-400 hover:text-brand hover:bg-brandsoft">
                        {copied === -1 ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                      <button onClick={() => setBriefVote(1)} title="good"
                        className={`p-1.5 hover:bg-brandsoft ${briefVote === 1 ? "text-brand" : "text-stone-400 hover:text-brand"}`}><ThumbsUp size={14} /></button>
                      <button onClick={() => setBriefVote(-1)} title="bad"
                        className={`p-1.5 hover:bg-brandsoft ${briefVote === -1 ? "text-brand" : "text-stone-400 hover:text-brand"}`}><ThumbsDown size={14} /></button>
                    </div>
                  </>
                )}
              </div>

              {suggest.length > 0 && convo.messages.length === 0 && (
                <div className="grid sm:grid-cols-3 gap-2 mt-3">
                  {suggest.map((sug, i) => (
                    <button key={i} onClick={() => send(sug)}
                      className="text-left bg-stone-100 hover:bg-brandsoft border border-transparent hover:border-brandline p-3.5 text-[13px] font-medium text-stone-700 transition rounded-2xl">
                      {sug}
                      <CornerDownLeft size={13} className="mt-2 text-stone-400" />
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-5 mt-2 max-w-[72ch]">
                {convo.messages.map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-brandsoft text-ink text-[14px] px-4 py-2.5 rounded-2xl rounded-br-md flex items-center gap-2">
                        <span className="flex-1">{m.q}</span>
                        <span className="w-7 h-7 bg-amber-800 text-white text-xs font-bold grid place-items-center shrink-0 rounded-full">S</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5 mt-3">
                      <span className="w-8 h-8 bg-stone-950 text-brand grid place-items-center shrink-0 rounded-full"><Bot size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">Meeko</span>
                          <span className="text-[11px] text-stone-400">Powered by Gemma 4</span>
                          <span className={`text-[10px] font-bold px-2 py-px border ${m.r.verdict === "SUPPORTED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                            {m.r.verdict}
                          </span>
                        </div>
                        <div className="md-body text-[14.5px] mt-1.5 text-stone-800">
                          <ReactMarkdown components={{
                            p: citeWrap("p", jump), li: citeWrap("li", jump),
                            strong: citeWrap("strong", jump), em: citeWrap("em", jump),
                          }}>{m.r.answer}</ReactMarkdown>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <button onClick={() => copy(i, m.r.answer)} title="copy" className="p-1.5 text-stone-400 hover:text-brand hover:bg-brandsoft rounded">
                            {copied === i ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                          <button onClick={() => setVotes((v) => ({ ...v, [i]: 1 }))} title="good"
                            className={`p-1.5 rounded hover:bg-brandsoft ${votes[i] === 1 ? "text-brand" : "text-stone-400 hover:text-brand"}`}><ThumbsUp size={14} /></button>
                          <button onClick={() => setVotes((v) => ({ ...v, [i]: -1 }))} title="bad"
                            className={`p-1.5 rounded hover:bg-brandsoft ${votes[i] === -1 ? "text-brand" : "text-stone-400 hover:text-brand"}`}><ThumbsDown size={14} /></button>
                        </div>
                        {m.r.evidence.length > 0 && (
                          <>
                            <div className="flex items-center gap-1.5 mt-2 text-[12px] font-bold">
                              <FileText size={13} className="text-brand" /> Sources
                              <span className="bg-brandsoft text-branddark text-[10px] px-1.5 py-px">{new Set(m.r.evidence.map((e) => e.chunk_id)).size}</span>
                            </div>
                            <div className="grid sm:grid-cols-3 gap-2 mt-1.5">
                              {m.r.evidence.filter((e, j, a) => a.findIndex((x) => x.chunk_id === e.chunk_id) === j).slice(0, 3).map((e, j) => (
                                <div key={j}
                                  className="relative text-left border border-stone-200 bg-white p-2.5 hover:border-brand transition min-w-0 rounded-xl shadow-sm">
                                  <button onClick={() => jump(e.chunk_id, e.quote)} aria-label={`Open source ${fileNameOf(e) || e.chunk_id}`}
                                    className="absolute inset-0 rounded-xl cursor-pointer" />
                                  <span className="flex items-center gap-1 text-[11px] font-bold truncate">
                                    <FileText size={12} className="text-red-500 shrink-0" />
                                    <span className="truncate">{fileNameOf(e) || e.chunk_id}</span>
                                    <button onClick={(ev) => { ev.stopPropagation(); toggleHl(e.chunk_id, e.page, e.quote, (e as any).file ?? undefined); }}
                                  title="bookmark" className="relative z-10 ml-auto shrink-0 p-1 text-stone-300 hover:text-brand">
                                  <Bookmark size={12} className={highlights.some((h) => h.chunk === e.chunk_id) ? "fill-brand text-brand" : ""} />
                                </button>
                                  </span>
                                  <span className="block text-[11px] text-stone-500 mt-0.5">{e.page ? `Page ${e.page.replace("p.", "")}` : e.chunk_id}</span>
                                  <span className="block text-[12px] text-stone-600 mt-1 line-clamp-2">“{e.quote.slice(0, 120)}…”</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {busy && <div className="text-sm text-stone-500 mt-3 animate-pulse">Meeko is reading your notes…</div>}
              {selFiles && (
                <div className="text-[11px] text-stone-400 mt-2">
                  Answering from {selFiles.length} of {sum?.files.length ?? 0} sources ·{" "}
                  <button onClick={() => setSelFiles(null)} className="underline hover:text-brand">use all</button>
                </div>
              )}
              <div className="sticky bottom-3 mt-4 max-w-[72ch]">
                <div className="bg-white border border-stone-200 shadow-lg p-2 rounded-2xl">
                  <textarea ref={inputRef} value={q} rows={2}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(q); } }}
                    placeholder="Ask a question or create something…"
                    className="w-full bg-transparent px-3 pt-2 outline-none text-[15px] resize-none" />
                  <div className="flex items-center gap-2 px-1 pb-0.5">
                    <button onClick={() => moreRef.current?.click()} title="add files" className="p-2 text-stone-400 hover:text-brand"><Paperclip size={16} /></button>
                    <span className="text-xs font-bold border border-stone-200 px-2.5 py-1.5 flex items-center gap-1 rounded-full">
                      <Sparkles size={12} className="text-brand" /> Gemma 4
                    </span>
                    <span className="text-[11px] text-stone-400 hidden sm:inline">{sum?.files.length ?? 0} source{(sum?.files.length ?? 0) === 1 ? "" : "s"}</span>
                    <span className="flex-1" />
                    {busy ? (
                      <button onClick={stop} aria-label="stop"
                        className="w-10 h-10 shrink-0 bg-stone-950 text-white grid place-items-center hover:bg-red-700 rounded-xl"><Square size={15} /></button>
                    ) : (
                      <button onClick={() => send(q)} disabled={!q.trim()} aria-label="send"
                        className="w-10 h-10 shrink-0 bg-brand text-white grid place-items-center disabled:opacity-40 hover:bg-branddark rounded-xl"><SendHorizontal size={16} /></button>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                  {chips.map((c) => (
                    <button key={c.label} onClick={c.run}
                      className="shrink-0 text-[12px] font-medium px-3 py-1.5 bg-brandsoft text-stone-700 hover:bg-brandtint transition rounded-full">
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab === "explain" && id && <ExplainTab nb={id} />}
          {tab === "quiz" && id && <QuizTab nb={id} files={selFiles} />}
          {tab === "cards" && id && <FlashcardsTab nb={id} files={selFiles} />}
          {tab === "audio" && id && <AudioTab nb={id} files={selFiles} />}
        </div>

        {/* right: document viewer */}
        <div className={`min-w-0 ${mView === "viewer" ? "" : "hidden lg:block"}`}>
          <div className="border border-stone-200 bg-white shadow-sm lg:sticky lg:top-20 rounded-xl overflow-hidden">
            <div className="flex gap-5 px-4 pt-3 text-[13px] font-bold border-b border-stone-100">
              {(["docs", "notes", "highlights"] as const).map((t) => (
                <button key={t} onClick={() => setVTab(t)}
                  className={`pb-2 -mb-px capitalize ${vTab === t ? "text-brand border-b-2 border-brand" : "text-stone-400 hover:text-stone-600"}`}>
                  {t === "docs" ? "Documents" : t === "notes" ? `Notes${myNotes.length ? ` · ${myNotes.length}` : ""}` : `Highlights${highlights.length ? ` · ${highlights.length}` : ""}`}
                </button>
              ))}
            </div>

            {vTab === "docs" && (
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <select value={vFile} onChange={(e) => { setVFile(parseInt(e.target.value)); setVPage(1); }}
                      className="w-full appearance-none bg-stone-50 border border-stone-200 pl-9 pr-8 py-2 text-[13px] font-semibold outline-none rounded-lg truncate">
                      {pdfFiles.map((f) => (
                        <option key={f.idx} value={f.idx}>{f.name}</option>
                      ))}
                      {pdfFiles.length === 0 && <option value={0}>No PDF in this notebook</option>}
                    </select>
                    <FileText size={14} className="absolute left-2.5 top-2.5 text-red-500" />
                  </div>
                  <span className="text-xs font-mono2 text-stone-500 shrink-0">{vPage} / {maxPage}</span>
                  <button onClick={() => setVPage((p) => Math.max(1, p - 1))} aria-label="prev page"
                    className="p-2 border border-stone-200 hover:border-brand rounded-lg"><ChevronUp size={14} /></button>
                  <button onClick={() => setVPage((p) => Math.min(maxPage, p + 1))} aria-label="next page"
                    className="p-2 border border-stone-200 hover:border-brand rounded-lg"><ChevronDown size={14} /></button>
                </div>

                <div ref={viewerBox} className="relative mt-2 border border-stone-100 bg-stone-50 overflow-auto" style={{ height: 480 }}>
                  {fileUrl ? (
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}>
                      <embed src={fileUrl} type="application/pdf" className="w-full block" style={{ height: 478 }} />
                    </div>
                  ) : (
                    <div className="p-5 text-[13px] text-stone-500">
                      {preview ? <div className="whitespace-pre-wrap text-stone-700">{preview.text}</div>
                        : "Upload a PDF to read it here. Text notes show in Sources."}
                    </div>
                  )}
                  {preview?.quote && preview.file === vFile && (
                    <div className="sticky bottom-2 mx-2 bg-[#FFF7CC] border border-amber-300 text-[12px] p-2.5 shadow flex gap-2">
                      <span className="flex-1">
                        <span className="font-bold">Supporting evidence{preview.page ? ` · ${preview.page}` : ""}: </span>
                        “{preview.quote.slice(0, 200)}…”
                      </span>
                      <button onClick={() => toggleHl(preview.id, preview.page, preview.quote ?? "", preview.file)} title="bookmark"
                        className="shrink-0 p-1 text-stone-500 hover:text-brand">
                        <Bookmark size={14} className={highlights.some((h) => h.chunk === preview.id) ? "fill-brand text-brand" : ""} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  <button onClick={() => setVPage((p) => Math.max(1, p - 1))} aria-label="prev"
                    className="p-2 border border-stone-200 hover:border-brand rounded-lg"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-mono2 px-1">{vPage} / {maxPage}</span>
                  <button onClick={() => setVPage((p) => Math.min(maxPage, p + 1))} aria-label="next"
                    className="p-2 border border-stone-200 hover:border-brand rounded-lg"><ChevronRight size={14} /></button>
                  <span className="flex-1" />
                  <span className="text-xs font-mono2 text-stone-500">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="zoom out"
                    className="p-2 border border-stone-200 hover:border-brand rounded-full"><Minus size={14} /></button>
                  <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))} aria-label="zoom in"
                    className="p-2 border border-stone-200 hover:border-brand rounded-full"><Plus size={14} /></button>
                  <button onClick={() => viewerBox.current?.requestFullscreen?.()} aria-label="fullscreen"
                    className="p-2 border border-stone-200 hover:border-brand rounded-lg"><Maximize2 size={14} /></button>
                </div>
              </div>
            )}

            {vTab === "notes" && (
              <div className="p-3">
                <div className="flex gap-2">
                  <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && noteDraft.trim()) { persistNotes([{ t: noteDraft.trim(), ts: Date.now() }, ...myNotes]); setNoteDraft(""); } }}
                    placeholder="Jot a note…" className="flex-1 min-w-0 text-sm border border-stone-200 px-3 py-2 outline-none focus:border-brand rounded-lg" />
                  <button onClick={() => { if (noteDraft.trim()) { persistNotes([{ t: noteDraft.trim(), ts: Date.now() }, ...myNotes]); setNoteDraft(""); } }}
                    className="px-3 bg-stone-950 text-white text-sm font-bold hover:bg-brand rounded-lg">Add</button>
                </div>
                <div className="space-y-1.5 mt-2 max-h-72 overflow-auto">
                  {myNotes.map((n, i) => (
                    <div key={n.ts} className="text-[13px] bg-stone-50 border border-stone-100 p-2.5 flex gap-2 rounded-lg">
                      <span className="flex-1">{n.t}</span>
                      <button onClick={() => persistNotes(myNotes.filter((_, j) => j !== i))} aria-label="delete note"
                        className="text-stone-400 hover:text-red-600 shrink-0"><Trash2 size={13} /></button>
                    </div>
                  ))}
                  {myNotes.length === 0 && <div className="text-xs text-stone-400 text-center py-4">No notes yet — jot one while reading.</div>}
                </div>
              </div>
            )}

            {vTab === "highlights" && (
              <div className="p-3 space-y-1.5 max-h-80 overflow-auto">
                {highlights.map((h) => (
                  <button key={h.chunk} onClick={() => jump(h.chunk)}
                    className="w-full text-left text-[13px] bg-[#FFF7CC] border border-amber-200 p-2.5 hover:border-brand rounded-lg">
                    <span className="text-[11px] font-bold text-branddark">{h.chunk}{h.page ? ` · ${h.page}` : ""}</span>
                    <span className="block text-stone-700 mt-0.5">“{h.quote.slice(0, 160)}…”</span>
                  </button>
                ))}
                {highlights.length === 0 && <div className="text-xs text-stone-400 text-center py-4">Bookmark any source to pin it here.</div>}
              </div>
            )}
          </div>

          <div className="border border-stone-200 bg-white shadow-sm mt-4 rounded-xl overflow-hidden">
            <div className="px-4 pt-3 text-sm font-extrabold">Study Tools</div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {([
                { t: "Generate Quiz", d: "From this notebook", run: () => setTab("quiz") },
                { t: "Flashcards", d: "Key concepts", run: () => setTab("cards") },
                { t: "Summarize", d: "Quick overview", run: summarize },
              ]).map((s) => (
                <button key={s.t} onClick={s.run} className="border border-stone-200 p-2.5 text-left hover:border-brand transition rounded-xl bg-white">
                  <FileText size={15} className="text-brand" />
                  <span className="block text-[12px] font-bold mt-1.5">{s.t}</span>
                  <span className="block text-[10px] text-stone-500">{s.d}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border border-stone-200 bg-white p-4 shadow-sm mt-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-extrabold">Notebook Files</span>
              <button onClick={() => moreRef.current?.click()} className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1"><Plus size={12} /> Add Files</button>
            </div>
            <div className="space-y-2">
              {(sum?.files ?? []).map((f) => (
                <div key={f.idx} className="flex items-center gap-2 text-[13px] border border-stone-100 bg-stone-50/60 px-2.5 py-2 min-w-0 rounded-lg">
                  <input type="checkbox" checked={isOn(f.idx)} onChange={() => toggleFile(f.idx)}
                    title="Include this source in answers" className="w-4 h-4 accent-[#FF5A1F] shrink-0" />
                  <FileText size={14} className="text-red-500 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{f.name}</span>
                    <span className="block text-[11px] text-stone-500">{f.chunks} chunks · {(f.size / 1024).toFixed(0)} KB</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 shrink-0 rounded-full">Processed</span>
                </div>
              ))}
              {(sum?.files.length ?? 0) === 0 && <div className="text-xs text-stone-400">No files yet.</div>}
            </div>
          </div>

          {sum && <div className="mt-4"><SourcePanel bare index={sum.index} cited={cited} flashId={flashId} refs={refs} /></div>}
        </div>
      </div>
    </div>
  );
}

/* ================= landing: hero only ================= */
function Home({ health }: { health: { chat_model: string | null; embed_model: string | null } | null }) {
  const [modal, setModal] = useState(false);
  const [recent, setRecent] = useState<Convo[]>([]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    setRecent(loadConvos());
    api.health().catch(() => {});
  }, [modal]);
  const ticker = "TRACK 1 · BEST USE OF GEMMA 4 · PS-01 · EVIDENCE-FIRST TUTOR · PAGE-TAGGED ANSWERS · HONEST NOT_FOUND · ".repeat(4);

  function del(id: string) {
    const cs = loadConvos().filter((c) => c.id !== id);
    try { localStorage.setItem("sc-notebooks-v2", JSON.stringify(cs)); } catch { /* noop */ }
    setRecent(cs);
  }

  return (
    <>
      <div className="relative bg-brand text-white min-h-[100svh] flex flex-col overflow-hidden"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
        }}>
        <div className="absolute inset-0 hero-grid" />
        <div className="orb w-[480px] h-[480px] bg-amber-300/40 -top-40 -left-40" />
        <div className="orb w-[420px] h-[420px] bg-red-800/40 bottom-0 right-0" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: `translate(${tilt.x * -26}px, ${tilt.y * -18}px)` }}>
          <span className="font-display watermark text-[24vw]">STUDY</span>
        </div>

        <header className="relative z-20 px-4 md:px-10 py-4 flex items-center gap-4 md:gap-6 border-b border-white/25">
          <span className="font-display text-xl tracking-wide">SC<span className="text-stone-900">.</span></span>
          <nav className="hidden md:flex items-center gap-6 mx-auto text-[13px] font-semibold tracking-widest">
            <button onClick={() => setModal(true)} className="hover:text-stone-900 transition">NOTEBOOKS</button>
            <button onClick={() => setModal(true)} className="hover:text-stone-900 transition">QUIZ</button>
            <button onClick={() => setModal(true)} className="hover:text-stone-900 transition">EVIDENCE</button>
          </nav>
        </header>

        <div className="hidden md:block absolute top-20 right-6 md:right-10 z-20 w-60 bg-white text-stone-900 shadow-2xl floaty rounded-none">
          <div className="p-2">
            <div className="bg-stone-950 text-white text-[10px] font-mono2 px-2 py-2 flex items-center gap-2 rounded-none">
              <span className={`w-2 h-2 rounded-full shrink-0 ${health?.chat_model ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className="truncate">{health?.chat_model ? health.chat_model : "NO CHAT LLM — LOAD GEMMA"}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-2">
              <div>
                <div className="font-bold text-[13px] leading-tight">Gemma 4 · RAG</div>
                <div className="text-[11px] text-stone-500">Grounded / Verified</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-4 md:px-10 pt-6">
          <div className="font-mono2 text-[11px] tracking-[0.25em] text-brandtint flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white inline-block" /> EVIDENCE-FIRST TUTOR — TRACK 1 · GEMMA 4
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 md:px-6 text-center py-8">
          <button onClick={() => setModal(true)}
            className="bg-white text-stone-950 font-display text-xl md:text-2xl tracking-wide px-10 md:px-14 py-4 md:py-5 shadow-2xl hover:bg-stone-950 hover:text-white transition flex items-center gap-3 rounded-none">
            <Paperclip size={22} /> CREATE NOTEBOOK <ArrowRight size={22} />
          </button>
          <div className="font-mono2 text-[10px] text-brandtint/80 mt-3">PDF · TXT · MD — GROUNDED IN YOUR MATERIAL ONLY</div>

          {recent.length > 0 && (
            <div className="w-full mt-8 text-left">
              <div className="font-mono2 text-[10px] tracking-[0.25em] text-brandtint mb-2">RECENT NOTEBOOKS</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {recent.slice(0, 4).map((c) => (
                  <div key={c.id} className="bg-white/10 border border-white/25 backdrop-blur px-3 py-2.5 flex items-center gap-2">
                    <Link to={`/notebook/${c.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="block text-sm font-bold truncate">{c.title}</span>
                      <span className="block text-[11px] text-brandtint truncate">{c.messages.length} questions · {new Date(c.createdAt).toLocaleDateString()}</span>
                    </Link>
                    <button onClick={() => del(c.id)} aria-label="delete" className="p-1.5 hover:text-stone-900"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* bottom-left headline */}
        <div className="relative z-10 px-4 md:px-10 pb-4 leading-[0.9]">
          <h1 className="font-display text-white text-[11vw] md:text-[7vw] drop-shadow-lg">LEARN FROM</h1>
          <h1 className="font-display text-white text-[11vw] md:text-[7vw] drop-shadow-lg">YOUR NOTES.</h1>
        </div>

        <div className="relative z-20 border-t border-white/25 overflow-hidden">
          <div className="ticker-track font-mono2 text-[11px] tracking-widest text-brandtint py-2">
            <span className="pr-4">{ticker}</span><span className="pr-4">{ticker}</span>
          </div>
        </div>
      </div>
      {modal && <CreateModal onClose={() => setModal(false)} />}
    </>
  );
}

function Shell() {
  const [health, setHealth] = useState<{ chat_model: string | null; embed_model: string | null } | null>(null);
  const [theme, setTheme] = useState("light");
  useEffect(() => { api.health().then(setHealth).catch(() => {}); }, []);
  useEffect(() => {
    let t = "light";
    try { t = localStorage.getItem("sc-theme") || "light"; } catch { /* noop */ }
    (window as any).__setTheme = (nt: string) => setTheme(nt);
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);
  return (
    <Routes>
      <Route path="/" element={<Home health={health} />} />
      <Route path="/notebook/:id" element={<Notebook health={health} theme={theme} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
