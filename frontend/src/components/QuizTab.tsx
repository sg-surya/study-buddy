import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { useState } from "react";
import { api, type QuizQ } from "../api";

export default function QuizTab() {
  const [diff, setDiff] = useState("Easy");
  const [quiz, setQuiz] = useState<QuizQ[]>([]);
  const [src, setSrc] = useState("");
  const [ans, setAns] = useState<Record<number, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [graded, setGraded] = useState<{ score: number; total: number; results: { correct: boolean; explanation: string; hint: string }[] } | null>(null);

  async function gen() {
    setBusy(true); setGraded(null);
    try {
      const r = await api.quizGen(diff);
      setQuiz(r.questions); setSrc(r.source); setAns({});
    } catch { setSrc("backend unreachable"); }
    setBusy(false);
  }

  async function submit() {
    setBusy(true);
    try {
      const payload = quiz.map((_, i) => ans[i] ?? null);
      setGraded(await api.quizEval(payload));
    } catch { /* noop */ }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <select value={diff} onChange={(e) => setDiff(e.target.value)}
          className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none shadow-sm">
          {["Easy", "Medium", "Hard"].map((d) => <option key={d}>{d}</option>)}
        </select>
        <button onClick={gen} disabled={busy}
          className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold text-sm disabled:opacity-50 hover:bg-orange-700 shadow-sm">
          {busy ? "Generating…" : "Generate quiz (5 Qs)"}
        </button>
        {src && <code className="text-xs text-stone-400">source: {src}</code>}
      </div>
      <div className="mt-4 space-y-4">
        {quiz.map((item, i) => (
          <div key={i} className="border border-stone-200 rounded-3xl p-4 sm:p-5 bg-white shadow-sm">
            <div className="font-semibold">Q{i + 1}. {item.q}
              <span className="ml-2 text-[11px] font-normal text-stone-400 inline-flex items-center gap-1">
                {item.type}{item.page ? <><FileText size={11} /> p.{item.page}</> : ""}
              </span>
            </div>
            {item.type === "mcq" ? (
              <div className="mt-3 grid gap-2">
                {item.options?.map((o) => (
                  <label key={o} className={`flex items-center gap-2.5 text-sm px-4 py-2 rounded-xl border cursor-pointer transition ${ans[i] === o ? "border-orange-500 bg-orange-50" : "border-stone-200 hover:border-stone-400 bg-stone-50/50"}`}>
                    <input type="radio" name={`q${i}`} checked={ans[i] === o}
                      onChange={() => setAns((a) => ({ ...a, [i]: o }))} className="accent-orange-600" />
                    {o}
                  </label>
                ))}
              </div>
            ) : (
              <input value={(ans[i] as string) ?? ""} onChange={(e) => setAns((a) => ({ ...a, [i]: e.target.value }))}
                placeholder="Your answer…" className="mt-3 w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
            )}
            {graded && (
              <div className="mt-3 text-sm">
                <span className={`font-medium flex items-start gap-1.5 ${graded.results[i]?.correct ? "text-emerald-700" : "text-red-700"}`}>
                  {graded.results[i]?.correct ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                  {graded.results[i]?.explanation}
                </span>
                {!graded.results[i]?.correct && graded.results[i]?.hint && (
                  <div className="mt-2 text-[13px] text-amber-800 border border-amber-200 bg-amber-50 rounded-xl px-4 py-2">
                    Hint: {graded.results[i].hint}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {quiz.length > 0 && (
        <div className="mt-5 flex items-center gap-4 flex-wrap">
          <button onClick={submit} disabled={busy}
            className="px-6 py-3 rounded-2xl bg-orange-600 text-white font-semibold disabled:opacity-50 hover:bg-orange-700 shadow-sm">
            Submit & grade
          </button>
          {graded && <span className="text-xl font-extrabold">Score: {graded.score}/{graded.total}</span>}
        </div>
      )}
    </div>
  );
}
