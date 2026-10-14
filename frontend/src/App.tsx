import { ArrowRight, ArrowUpRight, BookMarked, Check, FileText, GraduationCap, Lightbulb, ListChecks, Menu, MessageCircleQuestion, Paperclip, PenLine, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, type ChunkInfo, type NotesSummary } from "./api";
import AskTab from "./components/AskTab";
import ExplainTab from "./components/ExplainTab";
import QuizTab from "./components/QuizTab";

type Tab = "ask" | "explain" | "quiz";

export default function App() {
  const [health, setHealth] = useState<{ chat_model: string | null; embed_model: string | null } | null>(null);
  const [notes, setNotes] = useState<NotesSummary | null>(null);
  const [tab, setTab] = useState<Tab>("ask");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [heroQ, setHeroQ] = useState("");
  const [pendingQ, setPendingQ] = useState<string>("");
  const [showPaste, setShowPaste] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const chunkRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { api.health().then(setHealth).catch(() => {}); }, []);

  async function wrap(fn: () => Promise<NotesSummary>) {
    setBusy(true);
    try { setNotes(await fn()); } catch { alert("Backend unreachable — run start.bat first."); }
    setBusy(false);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    await wrap(() => api.upload(f));
    api.health().then(setHealth).catch(() => {});
  }

  function jump(chunkId: string) {
    document.getElementById("source-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setFlash(chunkId);
    setTimeout(() => chunkRefs.current[chunkId]?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    setTimeout(() => setFlash(null), 2400);
  }

  function goStudio(t?: Tab) {
    if (t) setTab(t);
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" });
  }

  function askFromHero() {
    if (!heroQ.trim()) return;
    setPendingQ(heroQ); setHeroQ("");
    goStudio("ask");
  }

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

  return (
    <div className="min-h-full">
      {/* ============ HERO — full viewport ============ */}
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
          <button onClick={() => goStudio("ask")} aria-label="menu"
            className="ml-auto md:ml-0 hover:text-stone-900 transition"><Menu size={22} /></button>
        </header>

        {/* centered hero content */}
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

          {/* white ask + upload box */}
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
              <button onClick={() => setShowPaste((s) => !s)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-stone-100 hover:bg-orange-100 hover:text-orange-700 transition flex items-center gap-1">
                <PenLine size={12} /> Paste
              </button>
              {busy && <span className="text-[11px] text-stone-500 animate-pulse">loading…</span>}
              {notes && (
                <>
                  <span className="text-[11px] text-stone-500">
                    <b className="text-emerald-700">{notes.chunks} chunks</b>
                    {notes.pages.length > 0 && ` · p.${notes.pages.join(", p.")}`} · {notes.source}
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

        {/* floating live-model card */}
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

        {/* bottom strip */}
        <div className="relative z-20 border-t border-white/25 overflow-hidden">
          <div className="ticker-track font-mono2 text-[11px] tracking-widest text-orange-100 py-2">
            <span className="pr-4">{ticker}</span><span className="pr-4">{ticker}</span>
          </div>
        </div>
      </div>

      {/* ============ STUDIO ============ */}
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
                {tab === "ask" && <AskTab onJump={jump} pendingQ={pendingQ} clearPending={() => setPendingQ("")} />}
                {tab === "explain" && <ExplainTab />}
                {tab === "quiz" && <QuizTab />}
              </div>
              <aside id="source-panel" className="border border-stone-200 rounded-3xl p-4 bg-white shadow-sm lg:sticky lg:top-4 max-h-[70vh] overflow-auto">
                <h2 className="text-sm font-extrabold mb-1 flex items-center gap-1.5">
                  <BookMarked size={15} className="text-orange-600" /> Source
                  <span className="font-normal text-stone-400">— click evidence to jump here</span>
                </h2>
                <div className="space-y-2 mt-2">
                  {notes.index.map((c: ChunkInfo) => (
                    <div key={c.id} ref={(el) => { chunkRefs.current[c.id] = el; }}
                      className={`border rounded-xl p-2.5 text-[13px] transition ${flash === c.id ? "evidence-flash border-orange-500" : "border-stone-100 bg-stone-50/60"}`}>
                      <div className="text-[11px] font-bold text-orange-700 mb-0.5">{c.id}{c.page ? ` · p.${c.page}` : ""}</div>
                      <div className="text-stone-600">{c.preview}…</div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
          <footer className="border-t border-stone-200 mt-4 py-5 text-center text-xs text-stone-400">
            <span className="inline-flex items-center gap-1.5"><GraduationCap size={14} /> Study Companion · PS-01 · Track 1 Gemma 4</span>
          </footer>
        </div>
      )}
    </div>
  );
}
