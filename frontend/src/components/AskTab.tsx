import { ArrowUp, FileText, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../api";
import type { Msg } from "../store";

const verdictStyle: Record<string, string> = {
  SUPPORTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  NOT_FOUND: "bg-red-50 text-red-700 border-red-200",
};

export function AnswerCard({ h, onJump }: { h: Msg; onJump: (chunkId: string) => void }) {
  return (
    <div className="border border-stone-200 rounded-3xl p-4 sm:p-5 bg-white shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold">{h.q}</span>
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${verdictStyle[h.r.verdict] ?? "border-stone-200 text-stone-500"}`}>
          {h.r.verdict}
        </span>
        {h.r.model && <code className="text-[11px] text-stone-400">{h.r.model}</code>}
      </div>
      <div className="md-body text-[15px] mt-2 text-stone-700">
        <ReactMarkdown>{h.r.answer}</ReactMarkdown>
      </div>
      {h.r.evidence.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-bold text-stone-400 tracking-widest mb-1.5">SOURCES</div>
          <div className="grid gap-2">
            {h.r.evidence.filter((e, j, a) => a.findIndex((x) => x.chunk_id === e.chunk_id) === j).map((e, j) => (
              <button key={j} onClick={() => onJump(e.chunk_id)} title="Jump to source"
                className="text-left text-[13px] border border-orange-200 bg-orange-50 rounded-2xl px-3 sm:px-4 py-2.5 hover:bg-orange-100 transition flex items-start gap-1.5">
                <FileText size={14} className="text-orange-700 shrink-0 mt-0.5" />
                <span>
                  <span className="text-orange-700 font-bold">{e.chunk_id}{e.page ? ` · ${e.page}` : ""}</span>
                  <span className="text-stone-600"> “{e.quote.slice(0, 220)}…”</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {h.r.scores && h.r.scores.length > 0 && (
        <div className="text-[11px] text-stone-400 mt-2">
          RAG retrieval: {h.r.scores.slice(0, 4).map(([c, s]) => `c${c}=${s}`).join(" · ")}
        </div>
      )}
    </div>
  );
}

export default function AskTab({ onJump, pendingQ, clearPending, messages, onSend }: {
  onJump: (chunkId: string) => void; pendingQ?: string; clearPending?: () => void;
  messages?: Msg[]; onSend?: (q: string) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<Msg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hist = messages ?? local;

  async function run(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    try {
      if (onSend) { await onSend(question); setQ(""); }
      else {
        const r = await api.ask(question);
        setLocal((h) => [{ q: question, r }, ...h].slice(0, 8));
        setQ("");
      }
    } catch {
      setLocal((h) => [{ q: question, r: { answer: "Backend unreachable. Run `start.bat` first.", evidence: [], verdict: "NOT_FOUND" } }, ...h]);
    }
    setBusy(false);
  }

  useEffect(() => {
    if (pendingQ) { run(pendingQ); clearPending?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [hist, busy]);

  return (
    <div className="flex flex-col min-h-[50vh]">
      {hist.length === 0 && !busy && (
        <div className="flex-1 grid place-items-center py-10 text-center">
          <div>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 grid place-items-center mb-3">
              <MessageCircle size={22} />
            </div>
            <div className="font-bold">Ask anything from your notes</div>
            <div className="text-sm text-stone-500 mt-1">Answers come with page-tagged evidence — or an honest NOT_FOUND.</div>
          </div>
        </div>
      )}
      <div className="space-y-4 flex-1">
        {[...hist].reverse().map((h, i) => <AnswerCard key={i} h={h} onJump={onJump} />)}
      </div>
      {busy && <div className="text-sm text-stone-500 mt-3 animate-pulse">Gemma is reading your notes…</div>}
      <div className="sticky bottom-3 mt-4">
        <div className="bg-white border border-stone-200 rounded-3xl shadow-lg p-2">
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run(q)}
              placeholder="Ask from your notes…" className="flex-1 min-w-0 bg-transparent px-4 py-2.5 outline-none text-[15px]" />
            <button onClick={() => run(q)} disabled={busy} aria-label="send"
              className="w-11 h-11 shrink-0 rounded-2xl bg-orange-600 text-white disabled:opacity-50 hover:bg-orange-700 grid place-items-center">
              <ArrowUp size={18} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 px-2 pb-1 pt-1">
            <button onClick={() => run("What is the role of chlorophyll?")}
              className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-orange-100 hover:text-orange-700 transition">
              Supported: chlorophyll?
            </button>
            <button onClick={() => run("What is the Krebs cycle ATP yield in muscle?")}
              className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-orange-100 hover:text-orange-700 transition">
              Unsupported: Krebs ATP?
            </button>
          </div>
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
