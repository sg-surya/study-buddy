const BASE: string = import.meta.env.VITE_API_URL ?? "";
export const API_BASE = BASE;

async function req(path: string, init?: RequestInit) {
  const r = await fetch(BASE + path, init);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export interface Evidence { chunk_id: string; quote: string; page: string | null; file?: number | null }
export interface AskResult {
  answer: string; evidence: Evidence[]; verdict: string;
  model?: string; scores?: [number, number][]; retrieval?: string;
}
export interface ChunkInfo { id: string; page: string | null; preview: string; file?: number | null }
export interface NotesSummary {
  notebook_id: string; chunks: number; pages: number[];
  source: string; file: string; size: number; index: ChunkInfo[];
  files: { name: string; chunks: number; size: number; idx: number; pages: number }[];
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
  url: (url: string, nb: string): Promise<NotesSummary> =>
    req("/api/notes/url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, notebook_id: nb }) }),
  upload: async (file: File, nb: string): Promise<NotesSummary> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("notebook_id", nb);
    return req("/api/notes/upload", { method: "POST", body: fd });
  },
  clear: (nb: string): Promise<{ ok: boolean }> =>
    req("/api/notes/clear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "", notebook_id: nb }) }),
  ask: (question: string, nb = "default", signal?: AbortSignal, files?: number[] | null): Promise<AskResult> =>
    req("/api/tutor/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, notebook_id: nb, files: files ?? null }), signal }),
  explain: (level: string, nb = "default"): Promise<{ text: string; model: string }> =>
    req("/api/tutor/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level, notebook_id: nb }) }),
  quizGen: (difficulty: string, nb = "default", files?: number[] | null): Promise<{ questions: QuizQ[]; source: string }> =>
    req("/api/quiz/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ difficulty, notebook_id: nb, files: files ?? null }) }),
  quizEval: (answers: (string | null)[], nb = "default"): Promise<{ score: number; total: number; results: { correct: boolean; explanation: string; hint: string }[] }> =>
    req("/api/quiz/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, notebook_id: nb }) }),
  suggest: (nb = "default", files?: number[] | null): Promise<{ questions: string[] }> =>
    req("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notebook_id: nb, files: files ?? null }) }),
  flashcards: (nb = "default", files?: number[] | null): Promise<{ cards: { front: string; back: string; chunk?: number; page?: string | null }[] }> =>
    req("/api/flashcards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notebook_id: nb, files: files ?? null }) }),
  audio: (nb = "default", files?: number[] | null): Promise<{ script: { speaker: string; line: string }[] }> =>
    req("/api/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notebook_id: nb, files: files ?? null }) }),
  chunk: (nb: string, cid: string): Promise<{ id: string; page: string | null; text: string }> =>
    req(`/api/chunks/${nb}/${cid}`),
};
