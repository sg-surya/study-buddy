import { ArrowRight, BookMarked, CheckCircle2, ChevronDown, CircleDashed, FileText, Lightbulb, ListChecks, Loader2, MessageCircleQuestion, Paperclip, Search, Trash2, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api, type ChunkInfo, type NotesSummary } from "./api";
import { AnswerCard } from "./components/AskTab";
import ExplainTab from "./components/ExplainTab";
import QuizTab from "./components/QuizTab";
import { appendMsg, loadConvos, newNotebook, type Convo } from "./store";

type Tab = "ask" | "explain" | "quiz";

/* ================= upload transition: horizontal strips wipe once into notebook ================= */
function UploadTransition({ name }: { name: string }) {
  const rows = ["bg-orange-600", "bg-orange-500", "bg-stone-950", "bg-orange-600", "bg-amber-500"];
  return (
    <div className="transition-exit fixed inset-0 z-[60] bg-stone-950 text-white flex flex-col overflow-hidden">
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {rows.map((c, i) => (
          <div key={i} className={`strip-row flex-1 ${c}`} style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      <div className="rise-in relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ animationDelay: "0.35s" }}>
        <div className="font-display text-2xl tracking-wide">SC<span className="text-orange-500">.</span></div>
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
        <span className="absolute -top-2 -left-2 w-6 h-6 bg-orange-600" />
        <span className="absolute -top-2 -right-2 w-6 h-6 bg-orange-600" />
        <span className="absolute -bottom-2 -left-2 w-6 h-6 bg-orange-600" />
        <span className="absolute -bottom-2 -right-2 w-6 h-6 bg-orange-600" />
        <div className="px-6 pt-5">
          <div className="font-display text-2xl tracking-wide">CREATE NOTEBOOK</div>
          <div className="text-[13px] text-stone-500 mt-0.5">Add your notes and start learning with Meeko.</div>
          <button onClick={onClose} aria-label="close" className="absolute top-4 right-4 p-2 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <div className="p-6 pt-4">
          <label className="block text-xs font-bold tracking-widest text-stone-500">NOTEBOOK NAME</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operating Systems"
            className="mt-1.5 w-full border border-stone-300 px-4 py-3 text-[15px] outline-none focus:border-orange-600 rounded-none placeholder:text-stone-400" />

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
                className={`border-2 border-dashed p-6 text-center cursor-pointer transition ${drag ? "border-orange-600 bg-orange-50" : "border-stone-300 hover:border-orange-500"}`}>
                <input ref={fileRef} type="file" accept=".pdf,.txt,.md" multiple className="hidden"
                  onChange={(e) => { addFiles(e.target.files ?? undefined); e.target.value = ""; }} />
                <UploadCloud size={24} className="mx-auto text-orange-600" />
                <div className="font-bold text-sm mt-1.5">Drop files or browse</div>
                <div className="text-[11px] text-stone-500 mt-0.5">PDF, TXT, MD</div>
              </div>
            )}
            {mTab === "paste" && (
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} placeholder="Paste your notes here…"
                className="w-full text-sm border border-stone-300 p-3 outline-none focus:border-orange-600 rounded-none" />
            )}
            {mTab === "link" && (
              <div className="flex gap-2">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… article or docs page"
                  className="flex-1 min-w-0 text-sm border border-stone-300 px-4 py-3 outline-none focus:border-orange-600 rounded-none placeholder:text-stone-400" />
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-[13px] bg-stone-50 border border-stone-200 px-3 py-1.5">
                  <FileText size={13} className="text-orange-600 shrink-0" />
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
            className="mt-4 w-full py-3.5 bg-orange-600 text-white font-display text-lg tracking-wide hover:bg-stone-950 transition disabled:opacity-40 flex items-center justify-center gap-2 rounded-none">
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
        <BookMarked size={15} className="text-orange-600" /> Sources
        <span className="font-normal text-stone-400">· {citedItems.length} cited · {index.length} total</span>
      </h2>
      {citedItems.length > 0 && (
        <div className="space-y-2 mt-2">
          {citedItems.map((c) => (
            <div key={c.id} ref={(el) => { refs.current[c.id] = el; }}
              className={`border p-2.5 text-[13px] transition ${flashId === c.id ? "evidence-flash border-orange-500" : "border-orange-200 bg-orange-50/60"}`}>
              <div className="text-[11px] font-bold text-orange-700 mb-0.5">{c.id}{c.page ? ` · ${c.page}` : ""}</div>
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
              className="w-full text-sm bg-stone-50 border border-stone-200 pl-9 pr-3 py-2 outline-none focus:border-orange-500 rounded-none" />
          </div>
          <div className="space-y-2 mt-2">
            {rest.slice(0, 60).map((c) => (
              <div key={c.id} ref={(el) => { refs.current[c.id] = el; }}
                className={`border p-2.5 text-[13px] transition ${flashId === c.id ? "evidence-flash border-orange-500" : "border-stone-100 bg-stone-50/60"}`}>
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

/* ================= notebook page: /notebook/:id ================= */
function Notebook({ health }: { health: { chat_model: string | null; embed_model: string | null } | null }) {
  const { id } = useParams();
  const [sum, setSum] = useState<NotesSummary | null>(null);
  const [convo, setConvo] = useState<Convo | null>(null);
  const [tab, setTab] = useState<Tab>("ask");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!id) return;
    api.summary(id).then(setSum).catch(() => setSum(null));
    setConvo(loadConvos().find((c) => c.id === id) ?? null);
  }, [id]);

  /* pipeline process plays on the notebook page itself */
  useEffect(() => {
    setRevealed(0);
    const timers = [1, 2, 3, 4].map((n) => setTimeout(() => setRevealed(n), n * 350));
    return () => timers.forEach(clearTimeout);
  }, [id]);

  async function send(question: string) {
    if (!question.trim() || busy || !id) return;
    setBusy(true);
    try {
      const r = await api.ask(question, id);
      setConvo((c) => (c ? { ...c, messages: [...c.messages, { q: question, r }] } : c));
      appendMsg(id, { q: question, r });
      setQ("");
    } catch { /* noop */ }
    setBusy(false);
  }

  function jump(chunkId: string) {
    setFlashId(chunkId);
    setTimeout(() => refs.current[chunkId]?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    setTimeout(() => setFlashId(null), 2400);
  }

  if (!convo) return <div className="p-10 text-center text-stone-500">Notebook not found. <Link to="/" className="underline font-bold">Home</Link></div>;
  const cited = [...new Set(convo.messages.flatMap((m) => m.r.evidence.map((e) => e.chunk_id)))];
  const steps = [
    { label: `Uploaded ${convo.file?.name ?? convo.source}`, working: "Uploading file…", sub: convo.file ? `${(convo.file.size / 1024).toFixed(0)} KB` : "", done: true },
    { label: sum ? `Parsed ${sum.pages.length > 0 ? `${sum.pages.length} pages` : "text"}` : "Parsed", working: "Parsing pages…", sub: "", done: !!sum },
    { label: sum ? `Chunked into ${sum.chunks} pieces` : "Chunked", working: "Chunking notes…", sub: "", done: !!sum },
    { label: health?.embed_model ? `Retrieval: ${health.embed_model.slice(0, 26)}` : "Retrieval: TF-IDF fallback", working: "Linking evidence…", sub: "", done: !!health },
  ];

  return (
    <div className="min-h-full bg-[#faf7f1]">
      <header className="border-b border-stone-200 bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/" className="font-display text-lg">SC<span className="text-orange-600">.</span></Link>
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{convo.title}</div>
          <div className="text-[11px] text-stone-500 truncate">
            {convo.file ? `${convo.file.name} · indexed in ${convo.file.secs.toFixed(1)}s` : convo.source} · {convo.messages.length} questions
          </div>
        </div>
        <Link to="/" className="ml-auto text-xs font-bold px-3 py-1.5 border border-stone-200 hover:border-orange-500 hover:text-orange-700 rounded-none">New notebook</Link>
      </header>
      {!sum && (
        <div className="max-w-6xl mx-auto px-4 mt-4 text-xs font-bold bg-amber-50 border border-amber-200 p-3 text-amber-800">
          Backend restarted or notes cleared — re-upload this file from <Link to="/" className="underline">home</Link> to keep asking here.
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 py-5 grid lg:grid-cols-[340px_1fr] gap-5 items-start">
        <div className="lg:sticky lg:top-16 max-h-[calc(100vh-5rem)] overflow-auto space-y-4 pr-0.5">
          <div className="border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 bg-orange-600 text-white grid place-items-center shrink-0"><FileText size={18} /></span>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{convo.file?.name ?? convo.source}</div>
                <div className="text-[11px] text-stone-500">
                  {sum ? `${sum.chunks} chunks${sum.pages.length > 0 ? ` · ${sum.pages.length} pages` : ""}` : "indexing…"}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {steps.map((s, i) => {
                const shown = i < revealed && s.done;
                const working = i === revealed && !s.done;
                return (
                  <div key={i} className={`rise-in flex items-center gap-2 text-xs ${shown ? "" : "opacity-0"}`}>
                    {shown
                      ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      : <CircleDashed size={14} className="text-stone-300 animate-spin shrink-0" />}
                    <span className={`min-w-0 truncate ${shown ? "text-stone-700 font-medium" : "text-stone-400"}`}>
                      {working ? s.working : s.label}
                    </span>
                    {s.sub && shown && <span className="text-stone-400 ml-auto shrink-0">{s.sub}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          {sum
            ? <SourcePanel bare index={sum.index} cited={cited} flashId={flashId} refs={refs} />
            : <div className="border border-dashed border-stone-300 p-6 text-center text-xs text-stone-400">Sources appear after loading notes.</div>}
        </div>
        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([
              { id: "ask", label: "Ask", icon: <MessageCircleQuestion size={16} /> },
              { id: "explain", label: "Explain", icon: <Lightbulb size={16} /> },
              { id: "quiz", label: "Quiz", icon: <ListChecks size={16} /> },
            ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-2 px-4 py-3 border transition text-sm font-bold ${tab === t.id ? "bg-stone-950 border-stone-950 text-white" : "bg-white border-stone-200 hover:border-stone-400"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {tab === "ask" && (
            <div>
              <div className="space-y-4">
                {convo.messages.map((m, i) => <AnswerCard key={i} h={m} onJump={jump} />)}
              </div>
              {busy && <div className="text-sm text-stone-500 mt-3 animate-pulse">Gemma is reading your notes…</div>}
              <div className="sticky bottom-3 mt-4">
                <div className="bg-white border border-stone-200 shadow-lg p-2 flex gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(q)}
                    placeholder="Follow-up question…" className="flex-1 min-w-0 bg-transparent px-4 py-2.5 outline-none text-[15px]" />
                  <button onClick={() => send(q)} disabled={busy}
                    className="px-5 bg-orange-600 text-white font-bold text-sm disabled:opacity-50 hover:bg-orange-700 rounded-none">Ask</button>
                </div>
              </div>
            </div>
          )}
          {tab === "explain" && id && <ExplainTab nb={id} />}
          {tab === "quiz" && id && <QuizTab nb={id} />}
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
      <div className="relative bg-orange-600 text-white min-h-[100svh] flex flex-col overflow-hidden"
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
          <div className="font-mono2 text-[11px] tracking-[0.25em] text-orange-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white inline-block" /> EVIDENCE-FIRST TUTOR — TRACK 1 · GEMMA 4
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 md:px-6 text-center py-8">
          <button onClick={() => setModal(true)}
            className="bg-white text-stone-950 font-display text-xl md:text-2xl tracking-wide px-10 md:px-14 py-4 md:py-5 shadow-2xl hover:bg-stone-950 hover:text-white transition flex items-center gap-3 rounded-none">
            <Paperclip size={22} /> CREATE NOTEBOOK <ArrowRight size={22} />
          </button>
          <div className="font-mono2 text-[10px] text-orange-100/80 mt-3">PDF · TXT · MD — GROUNDED IN YOUR MATERIAL ONLY</div>

          {recent.length > 0 && (
            <div className="w-full mt-8 text-left">
              <div className="font-mono2 text-[10px] tracking-[0.25em] text-orange-100 mb-2">RECENT NOTEBOOKS</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {recent.slice(0, 4).map((c) => (
                  <div key={c.id} className="bg-white/10 border border-white/25 backdrop-blur px-3 py-2.5 flex items-center gap-2">
                    <Link to={`/notebook/${c.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="block text-sm font-bold truncate">{c.title}</span>
                      <span className="block text-[11px] text-orange-100 truncate">{c.messages.length} questions · {new Date(c.createdAt).toLocaleDateString()}</span>
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
          <div className="ticker-track font-mono2 text-[11px] tracking-widest text-orange-100 py-2">
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
  useEffect(() => { api.health().then(setHealth).catch(() => {}); }, []);
  return (
    <Routes>
      <Route path="/" element={<Home health={health} />} />
      <Route path="/notebook/:id" element={<Notebook health={health} />} />
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
