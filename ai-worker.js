// Free, in-browser AI: zero-shot theme coding with Transformers.js (runs on this computer).
// Lives in a worker so the voice conversation never stutters while the model works.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODELS = ["Xenova/nli-deberta-v3-xsmall", "Xenova/mobilebert-uncased-mnli"];
let classifier = null;

async function load() {
  for (const m of MODELS) {
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
  postMessage({ type: "failed" });
}

const queue = [];
let busy = false;
async function pump() {
  if (busy || !classifier) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      const r = await classifier(job.text, job.labels, {
        multi_label: true,
        hypothesis_template: "This answer is about {}.",
      });
      const scored = r.labels.map((l, i) => ({ label: l, score: +r.scores[i].toFixed(3) }));
      let keep = scored.filter(x => x.score >= 0.6).slice(0, 3);
      // Nothing confident: keep the top label plus any near-tie, marked as weak for review.
      if (!keep.length) keep = scored.filter(x => x.score >= scored[0].score * 0.8).slice(0, 2).map(x => ({ ...x, weak: true }));
      postMessage({ type: "result", id: job.id, codes: keep });
    } catch (e) {
      postMessage({ type: "result", id: job.id, codes: [], error: String(e.message || e) });
    }
  }
  busy = false;
}

onmessage = e => {
  const d = e.data;
  if (d.type === "load") load().then(pump);
  if (d.type === "classify") { queue.push(d); pump(); }
};
