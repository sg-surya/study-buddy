import type { AskResult } from "./api";

export interface Msg { q: string; r: AskResult }
export interface FileMeta { name: string; size: number; pages: number; chunks: number; secs: number }
export interface Convo {
  id: string; title: string; createdAt: number;
  source: string; file: FileMeta | null; messages: Msg[];
}

const KEY = "sc-notebooks-v2";

export function loadConvos(): Convo[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(cs: Convo[]) {
  try { localStorage.setItem(KEY, JSON.stringify(cs.slice(0, 30))); } catch { /* quota */ }
}

export function newNotebook(id: string, source: string, file: FileMeta | null, title?: string): Convo {
  const c: Convo = {
    id, title: title || file?.name.replace(/\.[^.]+$/, "") || source.slice(0, 48) || "Untitled",
    createdAt: Date.now(), source, file, messages: [],
  };
  const cs = [c, ...loadConvos().filter((x) => x.id !== id)];
  save(cs);
  return c;
}

export function appendMsg(id: string, m: Msg): Convo[] {
  const cs = loadConvos().map((c) => (c.id === id ? { ...c, messages: [...c.messages, m].slice(-30) } : c));
  save(cs);
  return cs;
}
