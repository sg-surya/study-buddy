import { ArrowRight, ArrowUpRight, BookMarked, Check, ChevronDown, FileText, GraduationCap, Lightbulb, ListChecks, Menu, MessageCircleQuestion, Paperclip, PenLine, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HashRouter, Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api, type ChunkInfo, type NotesSummary } from "./api";
import AskTab from "./components/AskTab";
import { AnswerCard } from "./components/AskTab";
import ExplainTab from "./components/ExplainTab";
import QuizTab from "./components/QuizTab";
import { appendMsg, loadConvos, newConvo, type Convo } from "./store";

type Tab = "ask" | "explain" | "quiz";

/* ---------- shared source panel: cited first, rest searchable + collapsed ---------- */
function SourcePanel({ index, cited, flashId, refs }: {
  index: ChunkInfo[]; cited: string[]; flashId: string | null;
  refs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const citedSet = new Set(cited);
  const citedItems = index.filter((c) => citedSet.has(c.id));
  const rest = index.filter((c) => !citedSet.has(c.id) &&
    (!q.trim() || (c.preview + c.id).toLowerCase().includes(q.toLowerCase())));
  return (
    <aside id="source-panel" className="border border-stone-200 rounded-3xl p-4 bg-white shadow-sm lg:sticky lg:top-4 max-h-[70vh] overflow-auto">
      <h2 className="text-sm font-extrabold mb-1 flex items-center gap-1.5">
        <BookMarked size={15} className="text-orange-600" /> Sources
        <span className="font-normal text-stone-400">· {citedItems.length} cited · {index.length} total</span>
      </h2>
      {citedItems.length > 0 && (
        <div className="space-y-2 mt-2">
          {citedItems.map((c) => (
            <div key={c.id} ref={(el) => { refs.current[c.id] = el; }}
              className={`border rounded-xl p-2.5 text-[13px] transition ${flashId === c.id ? "evidence-flash border-orange-500" : "border-orange-200 bg-orange-50/60"}`}>
              <div className="text-[11px] font-bold text-orange-700 mb-0.5">{c.id}{c.page ? ` · ${c.page}` : ""}</div>
              <div className="text-stone-600">{c.preview}…</div>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)}
        className="mt-3 w-full text-xs font-bold px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition flex items-center justify-center gap-1">
        {open ? "Hide" : "Show"} all {index.length} chunks <ChevronDown size={14} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <>
          <div className="relative mt-2">
            <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter chunks…"
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-orange-500" />
          </div>
          <div className="space-y-2 mt-2">
            {rest.slice(0, 60).map((c) => (
              <div key={c.id} ref={(el) => { refs.current[c.id] = el; }}
                className={`border rounded-xl p-2.5 text-[13px] transition ${flashId === c.id ? "evidence-flash border-orange-500" : "border-stone-100 bg-stone-50/60"}`}>
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

/* ---------- notebook view: /c/:id ---------- */
function Notebook({ notes }: { notes: NotesSummary | null }) {
  const { id } = useParams();
  const [convo, setConvo] = useState<Convo | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [flashId, setFlashId] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setConvo(loadConvos().find((c) => c.id === id) ?? null);
  }, [id]);

  async function send(question: string) {
    if (!question.trim() || busy || !id) return;
    setBusy(true);
    try {
      const r = await api.ask(question);
      setConvo({ ...(convo as Convo), messages: [...(convo?.messages ?? []), { q: question, r }] });
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

  if (!convo) return <div className="p-10 text-center text-stone-500">Notebook not found. <Link to="/" className="underline">Home</Link></div>;
  const cited = [...new Set(convo.messages.flatMap((m) => m.r.evidence.map((e) => e.chunk_id)))];

  return (
    <div className="min-h-full">
      <header className="border-b border-stone-200 bg-white/85 backdrop-blur px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/" className="font-display text-lg">SC<span className="text-orange-600">.</span></Link>
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{convo.title}</div>
          <div className="text-[11px] text-stone-500 truncate">{convo.source} · {convo.messages.length} questions</div>
        </div>
        <Link to="/" className="ml-auto text-xs font-bold px-3 py-1.5 rounded-full border border-stone-200 hover:border-orange-500 hover:text-orange-700">New notebook</Link>
      </header>
      {!notes && (
        <div className="max-w-6xl mx-auto px-4 mt-4 text-xs bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-800">
          Notes were cleared or the backend restarted — reload notes on the <Link to="/" className="underline font-bold">home hero</Link> to keep asking in this notebook.
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 py-5 grid lg:grid-cols-[1fr_330px] gap-5 items-start">
        <div>
          <div className="space-y-4">
            {convo.messages.map((m, i) => <AnswerCard key={i} h={m} onJump={jump} />)}
          </div>
          {busy && <div className="text-sm text-stone-500 mt-3 animate-pulse">Gemma is reading your notes…</div>}
          <div className="sticky bottom-3 mt-4">
            <div className="bg-white border border-stone-200 rounded-3xl shadow-lg p-2 flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(q)}
                placeholder="Follow-up question…" className="flex-1 min-w-0 bg-transparent px-4 py-2.5 outline-none text-[15px]" />
              <button onClick={() => send(q)} disabled={busy}
                className="px-5 rounded-2xl bg-orange-600 text-white font-bold text-sm disabled:opacity-50 hover:bg-orange-700">Ask</button>
            </div>
          </div>
        </div>
        {notes
          ? <SourcePanel index={notes.index} cited={cited} flashId={flashId} refs={refs} />
          : <div className="border border-dashed border-stone-300 rounded-3xl p-6 text-center text-xs text-stone-400">Sources appear after loading notes.</div>}
      </div>
    </div>
  );
}

/* ---------- home: hero + studio ---------- */
function Home({ health, notes, wrap, onFile, tab, setTab, paste, setPaste, busy, flashId, chunkRefs, jump, heroQ, setHeroQ, pendingQ, setPendingQ, showPaste, setShowPaste, fileRef, askFromHero, goStudio, setNotes }: any) {
  const nav = useNavigate();
  const steps = [
    { n: 1, label: "Source", done: !!notes },
    { n: 2, label: "Ask", done: false },
    { n: 3, label: "Quiz", done: false },
  ];
  const tabs: { id: Tab; label: string; hint: string; icon: React.ReactNode }[] = [
    { id: "ask", label: "Ask", hint: "Grounded answers with evidence", icon: <MessageCircleQuestion size={16} /> },
    { id: "explain", label: "Explain", hint: "Simple, detailed or exam-cram", icon: <Lightbulb size={16} /> },
    { id: "quiz", label: "Quiz", hint: "Test yourself with feedback", icon: <ListChecks size={16} /> },
  ];
  const ticker = "TRACK 1 · BEST USE OF GEMMA 4 · PS-01 · EVIDENCE-FIRST TUTOR · PAGE-TAGGED ANSWERS · HONEST NOT_FOUND · ".repeat(4);

  async function sendAndOpen(question: string) {
    const r = await api.ask(question);
    const c = newConvo(notes?.source || "notes", { q: question, r });
    nav(`/c/${c.id}`);
  }

  return (
    <>
      <div className="relative bg-orange-600 text-white min-h-[100svh] flex flex-col overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-display watermark text-[24vw]">STUDY</span>
        </div>

        <header className="relative z-20 px-4 md:px-10 py-4 flex items-center gap-4 md:gap-6 border-b border-white/25">
          <span className="font-display text-xl tracking-wide">SC<span className="text-stone-900">.</span></span>
          <nav className="hidden md:flex items-center gap-6 mx-auto text-[13px] font-semibold tracking-widest">
            {[["ask", "ASK"], ["explain", "EXPLAIN"], ["quiz", "QUIZ"]].map(([t, l]) => (
              <button key={t} onClick={() => goStudio(t as Tab)} className="hover:text-stone-900 transition">{l}</button>
            ))}
            <button onClick={() => goStudio()} className="hover:text-stone-900 transition">SOURCE</button>
          </nav>
          <button onClick={() => goStudio("ask")} aria-label="menu" className="ml-auto md:ml-0 hover:text-stone-900 transition"><Menu size={22} /></button>
        </header>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 md:px-6 text-center py-10">
          <div className="font-mono2 text-[11px] tracking-[0.25em] text-orange-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white inline-block" /> EVIDENCE-FIRST TUTOR — TRACK 1 · GEMMA 4
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-wide mt-4 drop-shadow-sm">
            LEARN FROM YOUR NOTES.
          </h1>
          <p className="text-orange-100 mt-3 text-sm md:text-[15px] max-w-lg">
            Upload once, ask anything, and verify every answer against page-tagged evidence.
          </p>

          <div className="w-full mt-6 bg-white rounded-2xl shadow-2xl p-2 text-left">
            <div className="flex gap-2 items-center">
              <button onClick={() => fileRef.current?.click()} title="Upload .txt / .md / .pdf" aria-label="attach notes"
                className="w-11 h-11 shrink-0 rounded-xl bg-stone-100 hover:bg-orange-100 text-stone-700 grid place-items-center transition">
                <Paperclip size={19} />
              </button>
              <input ref={fileRef} type="file" accept=".txt,.md,.pdf" className="hidden"
                onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
              <input value={heroQ} onChange={(e) => setHeroQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askFromHero()}
                placeholder={notes ? "Ask from your notes…" : "Attach notes, then ask here…"}
                className="flex-1 min-w-0 bg-transparent text-stone-900 px-2 sm:px-3 py-3.5 outline-none text-base placeholder:text-stone-400" />
              <button onClick={askFromHero} aria-label="ask"
                className="h-11 px-4 sm:px-6 my-1 rounded-xl bg-stone-950 text-white font-bold hover:bg-orange-600 transition shrink-0 flex items-center gap-1.5 text-sm sm:text-base">
                Ask <ArrowRight size={17} />
              </button>
            </div>
            {showPaste && (
              <div className="flex gap-2 p-1">
                <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste notes here…"
                  className="flex-1 min-w-0 text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 text-stone-900" />
                <button disabled={busy || !paste.trim()} onClick={() => { wrap(() => api.text(paste)); setPaste(""); setShowPaste(false); }}
                  className="text-sm font-semibold px-4 rounded-xl bg-stone-900 text-white disabled:opacity-40 shrink-0">Use</button>
              </div>
            )}
            <div className="flex items-center gap-2 px-2 sm:px-3 pt-1.5 pb-1 flex-wrap">
              <button disabled={busy} onClick={() => wrap(api.sample)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-stone-100 hover:bg-orange-100 hover:text-orange-700 transition disabled:opacity-50 flex items-center gap-1">
                <FileText size={12} /> Sample
              </button>
              <button onClick={() => setShowPaste((s: boolean) => !s)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-stone-100 hover:bg-orange-100 hover:text-orange-700 transition flex items-center gap-1">
                <PenLine size={12} /> Paste
              </button>
              {busy && <span className="text-[11px] text-stone-500 animate-pulse">loading…</span>}
              {notes && (
                <>
                  <span className="text-[11px] text-stone-500">
                    <b className="text-emerald-700">{notes.chunks} chunks</b>
                    {notes.pages.length > 0 && ` · ${notes.pages.length} pages`} · {notes.source}
                  </span>
                  <button onClick={() => { api.clear(); setNotes(null); }} aria-label="clear notes"
                    className="p-1 rounded-full hover:text-red-600"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold border ${s.done ? "bg-white text-orange-700 border-white" : "border-white/40 text-white/90"}`}>
                  <span className={`w-5 h-5 rounded-full grid place-items-center text-[11px] ${s.done ? "bg-orange-600 text-white" : "bg-white/20"}`}>
                    {s.done ? <Check size={12} /> : s.n}
                  </span>
                  {s.label}
                </div>
                {i < steps.length - 1 && <div className="w-6 sm:w-8 h-px bg-white/40" />}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:block absolute top-24 right-10 z-20 w-64 bg-white text-stone-900 rounded-lg shadow-2xl overflow-hidden">
          <div className="p-2">
            <div className="bg-stone-950 text-white text-[10px] font-mono2 rounded px-2 py-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health?.chat_model ? "bg-emerald-400" : "bg-red-400"}`} />
              {health?.chat_model ? "LIVE MODEL" : "NO CHAT LLM"} · {health?.chat_model?.split(":").pop()?.slice(0, 18) ?? "LOAD GEMMA"}
            </div>
            <div className="flex items-center justify-between px-2 py-2.5">
              <div>
                <div className="font-bold text-sm leading-tight">Gemma 4 · RAG</div>
                <div className="text-[11px] text-stone-500">Grounded / Verified</div>
              </div>
              <button onClick={() => goStudio("ask")} aria-label="open studio"
                className="w-9 h-9 bg-stone-950 text-white rounded grid place-items-center hover:bg-orange-600 transition"><ArrowUpRight size={16} /></button>
            </div>
          </div>
        </div>

        <div className="relative z-20 border-t border-white/25 overflow-hidden">
          <div className="ticker-track font-mono2 text-[11px] tracking-widest text-orange-100 py-2">
            <span className="pr-4">{ticker}</span><span className="pr-4">{ticker}</span>
          </div>
        </div>
      </div>

      {notes && (
        <div id="studio" className="scroll-mt-4">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid lg:grid-cols-[1fr_330px] gap-5 items-start">
              <div>
                <div className="grid sm:grid-cols-3 gap-2 mb-4">
                  {tabs.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition ${tab === t.id ? "bg-stone-900 border-stone-900 text-white shadow" : "bg-white border-stone-200 hover:border-stone-400 shadow-sm"}`}>
                      {t.icon}
                      <span>
                        <span className="font-bold text-sm block">{t.label}</span>
                        <span className={`text-[11px] block ${tab === t.id ? "text-stone-300" : "text-stone-500"}`}>{t.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {tab === "ask" && <AskTab onJump={jump} pendingQ={pendingQ} clearPending={() => setPendingQ("")} messages={[]} onSend={sendAndOpen} />}
                {tab === "explain" && <ExplainTab />}
                {tab === "quiz" && <QuizTab />}
              </div>
              <SourcePanel index={notes.index} cited={[]} flashId={flashId} refs={chunkRefs} />
            </div>
          </div>
          <footer className="border-t border-stone-200 mt-4 py-5 text-center text-xs text-stone-400">
            <span className="inline-flex items-center gap-1.5"><GraduationCap size={14} /> Study Companion · PS-01 · Track 1 Gemma 4</span>
          </footer>
        </div>
      )}
    </>
  );
}

/* ---------- shell: shared state above router ---------- */
function Shell() {
  const [health, setHealth] = useState<{ chat_model: string | null; embed_model: string | null } | null>(null);
  const [notes, setNotesState] = useState<NotesSummary | null>(null);
  const [tab, setTab] = useState<Tab>("ask");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [heroQ, setHeroQ] = useState("");
  const [pendingQ, setPendingQ] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const chunkRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { api.health().then(setHealth).catch(() => {}); }, []);

  async function wrap(fn: () => Promise<NotesSummary>) {
    setBusy(true);
    try { setNotesState(await fn()); } catch { alert("Backend unreachable — run start.bat first."); }
    setBusy(false);
  }
  async function onFile(f: File | undefined) {
    if (!f) return;
    await wrap(() => api.upload(f));
    api.health().then(setHealth).catch(() => {});
  }
  function jump(chunkId: string) {
    document.getElementById("source-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setFlashId(chunkId);
    setTimeout(() => chunkRefs.current[chunkId]?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    setTimeout(() => setFlashId(null), 2400);
  }
  function askFromHero() {
    if (!heroQ.trim()) return;
    setPendingQ(heroQ); setHeroQ("");
    setTab("ask");
  }
  function goStudio(t?: Tab) {
    if (t) setTab(t);
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <Routes>
      <Route path="/" element={
        <Home health={health} notes={notes} wrap={wrap} onFile={onFile} tab={tab} setTab={setTab}
          paste={paste} setPaste={setPaste} busy={busy} flashId={flashId} chunkRefs={chunkRefs} jump={jump}
          heroQ={heroQ} setHeroQ={setHeroQ} pendingQ={pendingQ} setPendingQ={setPendingQ}
          showPaste={showPaste} setShowPaste={setShowPaste} fileRef={fileRef}
          askFromHero={askFromHero} goStudio={goStudio} setNotes={setNotesState} />
      } />
      <Route path="/c/:id" element={<Notebook notes={notes} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
