import { Headphones, Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";

interface Line { speaker: string; line: string }

function pickVoices(): SpeechSynthesisVoice[] {
  try {
    const vs = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
    const uniq = vs.filter((v, i) => vs.findIndex((x) => x.name === v.name) === i);
    return uniq.length ? uniq : speechSynthesis.getVoices();
  } catch { return []; }
}

export default function AudioTab({ nb, files }: { nb: string; files?: number[] | null }) {
  const [script, setScript] = useState<Line[]>([]);
  const [err, setErr] = useState("");
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(-1);
  const stopRef = useRef(false);

  useEffect(() => {
    api.audio(nb, files ?? undefined).then((r) => {
      if ((r as any).error) setErr((r as any).error);
      else setScript(r.script);
    }).catch(() => setErr("Backend unreachable."));
    try { speechSynthesis.getVoices(); } catch { /* noop */ }
    return () => { try { speechSynthesis.cancel(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nb]);

  function speakAt(lines: Line[], i: number, voices: SpeechSynthesisVoice[]) {
    if (stopRef.current || i >= lines.length) {
      setPlaying(false); setIdx(-1);
      return;
    }
    setIdx(i);
    const u = new SpeechSynthesisUtterance(lines[i].line);
    const v = voices.length > 1 ? voices[lines[i].speaker === "A" ? 0 : 1 % voices.length] : voices[0];
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = 1.02;
    u.onend = () => speakAt(lines, i + 1, voices);
    u.onerror = () => speakAt(lines, i + 1, voices);
    speechSynthesis.speak(u);
  }

  function play() {
    if (!script.length || !("speechSynthesis" in window)) { setErr("Audio not supported in this browser."); return; }
    speechSynthesis.cancel();
    stopRef.current = false;
    setPlaying(true);
    speakAt(script, 0, pickVoices());
  }
  function pause() {
    if (speechSynthesis.paused) speechSynthesis.resume();
    else speechSynthesis.pause();
  }
  function stop() {
    stopRef.current = true;
    speechSynthesis.cancel();
    setPlaying(false); setIdx(-1);
  }

  if (err) return <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4">{err}</div>;
  if (!script.length) return <div className="text-sm text-stone-500 animate-pulse">Writing your audio overview…</div>;

  return (
    <div className="max-w-2xl">
      <div className="border border-stone-200 bg-white p-4 flex items-center gap-3 shadow-sm">
        <span className="w-11 h-11 bg-brand text-white grid place-items-center shrink-0"><Headphones size={19} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm">Audio Overview</div>
          <div className="text-[11px] text-stone-500">{script.length} lines · two hosts · from your notes</div>
        </div>
        {!playing ? (
          <button onClick={play} className="w-11 h-11 bg-stone-950 text-white grid place-items-center hover:bg-brand" aria-label="play">
            <Play size={17} />
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={pause} className="w-10 h-10 border border-stone-200 grid place-items-center hover:border-brand" aria-label="pause">
              <Pause size={15} />
            </button>
            <button onClick={stop} className="w-10 h-10 bg-stone-950 text-white grid place-items-center hover:bg-red-700" aria-label="stop">
              <Square size={14} />
            </button>
          </div>
        )}
      </div>
      {!("speechSynthesis" in window) && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 mt-2">This browser has no speech engine — read the script below instead.</div>
      )}
      <div className="space-y-2 mt-3">
        {script.map((l, i) => (
          <div key={i} className={`border p-3 text-[13.5px] transition ${i === idx ? "border-brand bg-brandsoft" : "border-stone-100 bg-white"}`}>
            <span className={`text-[11px] font-bold ${l.speaker === "A" ? "text-branddark" : "text-stone-500"}`}>
              {l.speaker === "A" ? "HOST · STUDENT" : "HOST · TUTOR"}
            </span>
            <p className="text-stone-700 mt-0.5">{l.line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
