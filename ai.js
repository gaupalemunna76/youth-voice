// AI helpers. Everything is optional: if a feature is missing, the survey carries on without it.
//  1. Theme coding  — Transformers.js zero-shot model in a worker (free, downloads once, then cached)
//  2. Translation   — Edge/Chrome built-in Translator API (Hindi → English) when the browser has it
//  3. Summary       — Edge/Chrome built-in Prompt API (on-device small language model) when available

let worker = null, ready = false, nextId = 1;
const waiting = new Map();
const listeners = new Set();
export const aiState = { coding: "off", codingModel: "", progress: 0, translator: "unknown", prompt: "unknown" };
const emit = () => listeners.forEach(f => f(aiState));
export const onAIState = f => { listeners.add(f); f(aiState); };

export function startCoding() {
  if (worker) return;
  try {
    worker = new Worker(new URL("./ai-worker.js", import.meta.url), { type: "module" });
  } catch (e) { aiState.coding = "unavailable"; emit(); return; }
  aiState.coding = "loading"; emit();
  worker.onmessage = e => {
    const d = e.data;
    if (d.type === "progress") { aiState.progress = d.pct; emit(); }
    if (d.type === "ready") { ready = true; aiState.coding = "ready"; aiState.codingModel = d.model.split("/")[1]; emit(); }
    if (d.type === "failed") { aiState.coding = "unavailable"; emit(); waiting.forEach(r => r([])); waiting.clear(); }
    if (d.type === "result") { const r = waiting.get(d.id); if (r) { waiting.delete(d.id); r(d.codes || []); } }
  };
  worker.onerror = () => { aiState.coding = "unavailable"; emit(); };
  worker.postMessage({ type: "load" });
}

export function classify(text, labels) {
  if (!worker || aiState.coding === "unavailable" || !text || !labels?.length) return Promise.resolve([]);
  const id = nextId++;
  return new Promise(res => {
    waiting.set(id, res);
    worker.postMessage({ type: "classify", id, text, labels });
    setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); res([]); } }, 180000);
  });
}

// ---- Built-in translation (Hindi → English) ----
let translator = null;
export async function initTranslator() {
  try {
    if (!("Translator" in self)) { aiState.translator = "not in this browser"; emit(); return; }
    const a = await self.Translator.availability({ sourceLanguage: "hi", targetLanguage: "en" });
    if (a === "unavailable") { aiState.translator = "unavailable"; emit(); return; }
    translator = await self.Translator.create({ sourceLanguage: "hi", targetLanguage: "en" });
    aiState.translator = "ready"; emit();
  } catch (e) { aiState.translator = "unavailable"; emit(); }
}
export async function toEnglish(text) {
  if (!text || !/[ऀ-ॿ]/.test(text)) return text;
  if (!translator) return null;
  try { return await withTimeout(translator.translate(text), 15000); } catch { return null; }
}

// ---- Built-in on-device language model (Prompt API) ----
export async function initPrompt() {
  try {
    if (!("LanguageModel" in self)) { aiState.prompt = "not in this browser"; emit(); return; }
    const a = await self.LanguageModel.availability();
    aiState.prompt = a === "available" ? "ready" : a === "unavailable" ? "unavailable" : "needs download"; emit();
  } catch { aiState.prompt = "unavailable"; emit(); }
}
export async function summarise(answersText) {
  if (aiState.prompt !== "ready") return null;
  try {
    const s = await self.LanguageModel.create({
      initialPrompts: [{ role: "system", content: "You summarise survey answers from young people in India. Write 2 short, warm, factual sentences in plain English about how this young person sees their future: their goal, why it matters, what could stop them, and what help they want. Do not invent anything." }],
    });
    const out = await withTimeout(s.prompt(answersText), 30000);
    s.destroy?.();
    return String(out).trim();
  } catch { return null; }
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}
