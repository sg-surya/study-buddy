import { Sparkles } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../api";

export default function ExplainTab({ nb }: { nb: string }) {
  const [level, setLevel] = useState("Simple");
  const [text, setText] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await api.explain(level, nb);
      setText(r.text); setModel(r.model);
    } catch { setText("Backend unreachable. Run `start.bat` first."); }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <select value={level} onChange={(e) => setLevel(e.target.value)}
          className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none shadow-sm">
          {["Simple", "Detailed", "Exam-cram"].map((l) => <option key={l}>{l}</option>)}
        </select>
        <button onClick={run} disabled={busy}
          className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold text-sm disabled:opacity-50 hover:bg-orange-700 shadow-sm flex items-center gap-1.5">
          <Sparkles size={15} /> {busy ? "Explaining…" : "Explain my notes"}
        </button>
      </div>
      {model && <code className="text-xs text-stone-400 block mt-2">{model}</code>}
      {text && (
        <div className="md-body text-[15px] mt-3 border border-stone-200 rounded-3xl p-4 sm:p-5 bg-white shadow-sm text-stone-700">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
