// AI helpers. Everything is optional: if a feature is missing, the survey carries on without it.
//  1. Theme coding  — Transformers.js zero-shot model in a worker (free, downloads once, then cached)
//  2. Translation   — browser's built-in Translator API (Hindi → English) when present, otherwise a free
//                     Transformers.js model (opus-mt-hi-en, ~110 MB, loaded only when a Hindi answer arrives)
//  3. Summary       — Edge/Chrome built-in Prompt API (on-device small language model) when available

let worker = null, ready = false, nextId = 1;
const waiting = new Map();
const listeners = new Set();
export const aiState = { coding: "off", codingModel: "", progress: 0, translator: "unknown", prompt: "unknown" };
const emit = () => listeners.forEach(f => f(aiState));
export const onAIState = f => { listeners.add(f); f(aiState); };

// Phones get the smaller model (~27 MB instead of ~87 MB) to save mobile data.
export function startCoding(mobile = false) {
  if (worker) return;
  const models = mobile ? ["Xenova/mobilebert-uncased-mnli"] : ["Xenova/nli-deberta-v3-xsmall", "Xenova/mobilebert-uncased-mnli"];
  try {
    worker = new Worker(new URL("./ai-worker.js", import.meta.url), { type: "module" });
  } catch (e) { aiState.coding = "unavailable"; emit(); return; }
  aiState.coding = "loading"; emit();
  worker.onmessage = e => {
    const d = e.data;
    if (d.type === "progress") { aiState.progress = d.pct; emit(); }
    if (d.type === "ready") { ready = true; aiState.coding = "ready"; aiState.codingModel = d.model.split("/")[1]; emit(); }
    if (d.type === "failed") { aiState.coding = "unavailable"; emit(); }
    if (d.type === "translator" && !translator) { aiState.translator = d.state === "ready" ? "ready (free model on this device)" : d.state === "loading" ? "downloading free model…" : "unavailable"; emit(); }
    if (d.type === "result") { const r = waiting.get(d.id); if (r) { waiting.delete(d.id); r(d); } }
  };
  worker.onerror = () => { aiState.coding = "unavailable"; emit(); };
  worker.postMessage({ type: "load", models });
}

export function classify(text, labels, question = "") {
  if (!worker || aiState.coding === "unavailable" || !text || !labels?.length) return Promise.resolve([]);
  const id = nextId++;
  return new Promise(res => {
    waiting.set(id, d => res(d.codes || []));
    worker.postMessage({ type: "classify", id, text, labels, question });
    setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); res([]); } }, 180000);
  });
}

// ---- Built-in translation (Hindi → English) ----
let translator = null;
export async function initTranslator() {
  try {
    if (!("Translator" in self)) { aiState.translator = "free model, loads on first Hindi answer"; emit(); return; }
    const a = await self.Translator.availability({ sourceLanguage: "hi", targetLanguage: "en" });
    if (a === "unavailable") { aiState.translator = "free model, loads on first Hindi answer"; emit(); return; }
    translator = await self.Translator.create({ sourceLanguage: "hi", targetLanguage: "en" });
    aiState.translator = "ready (built into browser)"; emit();
  } catch (e) { aiState.translator = "free model, loads on first Hindi answer"; emit(); }
}
export async function toEnglish(text) {
  if (!text || !/[ऀ-ॿ]/.test(text)) return text;
  if (translator) { try { return await withTimeout(translator.translate(text), 15000); } catch {} }
  if (!worker) return null;
  const id = nextId++;
  return new Promise(res => {
    waiting.set(id, d => res(d.text || null));
    worker.postMessage({ type: "translate", id, text });
    setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); res(null); } }, 240000);
  });
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
