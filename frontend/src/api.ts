const BASE = "http://localhost:8000";

async function req(path: string, init?: RequestInit) {
  const r = await fetch(BASE + path, init);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export interface Evidence { chunk_id: string; quote: string; page: string | null }
export interface AskResult {
  answer: string; evidence: Evidence[]; verdict: string;
  model?: string; scores?: [number, number][];
}
export interface ChunkInfo { id: string; page: string | null; preview: string }
export interface NotesSummary {
  notebook_id: string; chunks: number; pages: number[];
  source: string; file: string; size: number; index: ChunkInfo[];
}
export interface QuizQ {
  q: string; type: "mcq" | "short"; options?: string[];
  answer: string; explanation: string; chunk?: number; page?: string | null;
}

export const api = {
  health: (): Promise<{ ok: boolean; chat_model: string | null; embed_model: string | null }> =>
    req("/api/health"),
  summary: (nb: string): Promise<NotesSummary> => req(`/api/notebooks/${nb}`),
  sample: (nb: string): Promise<NotesSummary> =>
    req("/api/notes/sample", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "", notebook_id: nb }) }),
  text: (text: string, nb: string): Promise<NotesSummary> =>
    req("/api/notes/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, notebook_id: nb }) }),
  upload: async (file: File, nb: string): Promise<NotesSummary> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("notebook_id", nb);
    return req("/api/notes/upload", { method: "POST", body: fd });
  },
  clear: (nb: string): Promise<{ ok: boolean }> =>
    req("/api/notes/clear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "", notebook_id: nb }) }),
  ask: (question: string, nb = "default"): Promise<AskResult> =>
    req("/api/tutor/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, notebook_id: nb }) }),
  explain: (level: string, nb = "default"): Promise<{ text: string; model: string }> =>
    req("/api/tutor/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level, notebook_id: nb }) }),
  quizGen: (difficulty: string, nb = "default"): Promise<{ questions: QuizQ[]; source: string }> =>
    req("/api/quiz/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ difficulty, notebook_id: nb }) }),
  quizEval: (answers: (string | null)[], nb = "default"): Promise<{ score: number; total: number; results: { correct: boolean; explanation: string; hint: string }[] }> =>
    req("/api/quiz/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, notebook_id: nb }) }),
};
