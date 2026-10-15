// Free, in-browser AI with Transformers.js (runs on this device; models download once, then are cached):
//  - theme coding: zero-shot classification
//  - Hindi → English translation (loaded only when a Hindi answer arrives)
// Lives in a worker so the voice conversation never stutters while a model works.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

let classifier = null, classifierFailed = false, translator = null, translatorLoading = null;

async function load(models) {
  for (const m of models) {
    try {
      classifier = await pipeline("zero-shot-classification", m, {
        quantized: true,
        progress_callback: p => {
          if (p.status === "progress" && p.file && p.file.endsWith(".onnx")) {
            postMessage({ type: "progress", pct: Math.round(p.progress || 0), model: m });
          }
        },
      });
      postMessage({ type: "ready", model: m });
      return;
    } catch (e) {
      postMessage({ type: "warn", msg: `Could not load ${m}: ${e.message || e}` });
    }
  }
  classifierFailed = true;
  postMessage({ type: "failed" });
}

function getTranslator() {
  if (!translatorLoading) {
    postMessage({ type: "translator", state: "loading" });
    translatorLoading = pipeline("translation", "Xenova/opus-mt-hi-en", { quantized: true })
      .then(t => { translator = t; postMessage({ type: "translator", state: "ready" }); return t; })
      .catch(e => { postMessage({ type: "translator", state: "unavailable" }); return null; });
  }
  return translatorLoading;
}

// One job at a time, in order.
const queue = [];
let busy = false;
async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue[0];
    if (job.type === "classify" && !classifier) {
      if (!classifierFailed) break; // wait for the model
      queue.shift(); postMessage({ type: "result", id: job.id, codes: [] }); continue;
    }
    queue.shift();
    try {
      if (job.type === "classify") {
        const input = job.question ? `Question: ${job.question} Answer: ${job.text}` : job.text;
        const r = await classifier(input, job.labels, { multi_label: true, hypothesis_template: "This answer is about {}." });
        const scored = r.labels.map((l, i) => ({ label: l, score: +r.scores[i].toFixed(3) }));
        let keep = scored.filter(x => x.score >= 0.6).slice(0, 3);
        // Nothing confident: keep the top label plus any near-tie, marked as weak for review.
        if (!keep.length) keep = scored.filter(x => x.score >= scored[0].score * 0.8).slice(0, 2).map(x => ({ ...x, weak: true }));
        postMessage({ type: "result", id: job.id, codes: keep });
      } else if (job.type === "translate") {
        const t = await getTranslator();
        if (!t) { postMessage({ type: "result", id: job.id, text: null }); continue; }
        // Translate sentence by sentence; the model works best on short pieces.
        const parts = job.text.split(/(?<=[।.!?])\s+/).filter(Boolean);
        const out = [];
        for (const p of parts) out.push((await t(p))[0].translation_text);
        postMessage({ type: "result", id: job.id, text: out.join(" ") });
      }
    } catch (e) {
      postMessage({ type: "result", id: job.id, codes: [], text: null, error: String(e.message || e) });
    }
  }
  busy = false;
}

onmessage = e => {
  const d = e.data;
  if (d.type === "load") load(d.models).then(pump);
  if (d.type === "classify" || d.type === "translate") { queue.push(d); pump(); }
};
