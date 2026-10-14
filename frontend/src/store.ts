import type { AskResult } from "./api";

export interface Msg { q: string; r: AskResult }
export interface Convo { id: string; title: string; createdAt: number; source: string; messages: Msg[] }

const KEY = "sc-convos-v1";

export function loadConvos(): Convo[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(cs: Convo[]) {
  try { localStorage.setItem(KEY, JSON.stringify(cs.slice(0, 30))); } catch { /* quota */ }
}

export function newConvo(source: string, first: Msg): Convo {
  const c: Convo = {
    id: crypto.randomUUID().slice(0, 8),
    title: first.q.slice(0, 48) || "Untitled",
    createdAt: Date.now(), source, messages: [first],
  };
  const cs = [c, ...loadConvos()];
  save(cs);
  return c;
}

export function appendMsg(id: string, m: Msg): Convo[] {
  const cs = loadConvos().map((c) => (c.id === id ? { ...c, messages: [...c.messages, m].slice(-30) } : c));
  save(cs);
  return cs;
}
