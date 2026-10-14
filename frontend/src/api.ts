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
export interface NotesSummary { chunks: number; pages: number[]; source: string; index: ChunkInfo[] }
export interface QuizQ {
  q: string; type: "mcq" | "short"; options?: string[];
  answer: string; explanation: string; chunk?: number; page?: string | null;
}

export const api = {
  health: (): Promise<{ ok: boolean; chat_model: string | null; embed_model: string | null; notes_loaded: boolean }> =>
    req("/api/health"),
  sample: (): Promise<NotesSummary> => req("/api/notes/sample", { method: "POST" }),
  text: (text: string): Promise<NotesSummary> =>
    req("/api/notes/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }),
  upload: async (file: File): Promise<NotesSummary> => {
    const fd = new FormData();
    fd.append("file", file);
    return req("/api/notes/upload", { method: "POST", body: fd });
  },
  clear: (): Promise<{ ok: boolean }> => req("/api/notes/clear", { method: "POST" }),
  ask: (question: string): Promise<AskResult> =>
    req("/api/tutor/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }),
  explain: (level: string): Promise<{ text: string; model: string }> =>
    req("/api/tutor/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level }) }),
  quizGen: (difficulty: string): Promise<{ questions: QuizQ[]; source: string }> =>
    req("/api/quiz/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ difficulty }) }),
  quizEval: (answers: (string | null)[]): Promise<{ score: number; total: number; results: { correct: boolean; explanation: string; hint: string }[] }> =>
    req("/api/quiz/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) }),
};
