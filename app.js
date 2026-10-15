import { FLOW, STAGES, SCRIPT } from "./questions.js?v=20261015-1227";
import * as N from "./nlp.js?v=20261015-1227";
import * as V from "./voice.js?v=20261015-1227";
import * as AI from "./ai.js?v=20261015-1227";
import { SHEET_URL } from "./config.js?v=20261015-1227";

const VERSION = "20261015-1227";
const $ = id => document.getElementById(id);
const STORE = "youthvoice.v2.sessions";
const STAGE_ORDER = ["about", "dream", "belief", "path", "support", "voice"];
const ASKED = FLOW.filter(q => q.type !== "say");

const state = {
  lang: "en", voice: null, rate: 1, voiceOn: true, speakOn: true,
  run: 0, idx: 0, paused: false, pending: null,
  session: null, aiJobs: [],
};
const recLang = () => (state.lang === "hi" ? "hi-IN" : "en-IN");
const tr = o => (o ? o[state.lang] || o.en : "");
const textOf = q => tr(typeof q.text === "function" ? q.text(state.session.answers) : q.text);
const visible = q => !q.show || q.show(state.session.answers);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------- storage ----------------
function loadAll() { try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; } }
function saveSession() {
  const s = state.session; if (!s) return;
  try {
    s.updatedAt = new Date().toISOString();
    const all = loadAll().filter(x => x.id !== s.id);
    all.push(s);
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch (e) { console.warn("save failed", e); }
}

// ---------------- screens ----------------
function show(id) { ["sStart", "sQ", "sEnd", "sSessions"].forEach(s => ($(s).hidden = s !== id)); window.scrollTo(0, 0); }

// ---------------- start screen ----------------
async function initStart() {
  const notes = [];
  if (!V.canListen) notes.push("Speech recognition isn't available in this browser. Open this page in Microsoft Edge to answer by voice. Typing still works.");
  if (location.protocol === "file:") notes.push("For microphone access, open the tool with start.bat (it runs at http://localhost:8765) instead of opening the file directly.");
  if (V.canListen) notes.push("Speech is turned into text by an online service, so voice answers need an internet connection.");
  if (V.isMobile) notes.push("On phones: keep the media volume up so you can hear the questions. The phone beeps when the microphone starts and stops; that is normal. Speak after the beep and pause when you finish.");
  $("envNotice").hidden = !notes.length; $("envNotice").innerHTML = notes.map(n => `<div>${n}</div>`).join("");
  await V.loadVoices();
  fillVoices();
  AI.onAIState(renderAI);
  AI.startCoding(V.isMobile); AI.initTranslator(); AI.initPrompt();
}
function fillVoices() {
  const sel = $("voiceSel"); sel.innerHTML = "";
  const list = V.voicesFor(recLang());
  const best = V.pickVoice(recLang());
  if (!list.length) { sel.innerHTML = `<option>Device default ${state.lang === "hi" ? "Hindi" : "English"} voice</option>`; state.voice = null; return; }
  const local = v => v.lang.replace("_", "-").toLowerCase() === recLang().toLowerCase();
  list.sort((a, b) => (local(b) - local(a)) || (/natural/i.test(b.name) - /natural/i.test(a.name)));
  for (const v of list) {
    const o = document.createElement("option");
    o.value = v.name; o.textContent = `${v.name.replace(/^Microsoft /, "").replace(/ - .*$/, "")} (${v.lang})${/natural/i.test(v.name) ? " · Natural" : ""}`;
    if (best && v.name === best.name) o.selected = true;
    sel.appendChild(o);
  }
  state.voice = best;
}
function renderAI(s) {
  const coding = { off: "Not started", loading: `Downloading model… ${s.progress || 0}% (first time only)`, ready: `Ready (${s.codingModel})`, unavailable: "Not available (needs internet the first time)" }[s.coding] || s.coding;
  $("aiPanel").innerHTML = `
    <div><span>Microsoft Edge natural voice</span><b>${state.voice ? (/natural/i.test(state.voice.name) ? "Ready" : "Basic voice") : "None found"}</b></div>
    <div><span>Edge speech recognition</span><b>${V.canListen ? "Ready" : "Not in this browser"}</b></div>
    <div><span>Answer-quality check and smart follow-ups (rules)</span><b>Ready</b></div>
    <div><span>Theme coding (Transformers.js, runs on this PC)</span><b>${coding}</b></div>
    <div><span>Hindi → English translation (built-in browser AI)</span><b>${s.translator}</b></div>
    <div><span>Interview summary (built-in on-device AI)</span><b>${s.prompt === "ready" ? "Ready" : s.prompt + " · rule-based summary used"}</b></div>
    <div><span>Google Sheet (central record)</span><b>${SHEET_URL ? "Connected · interviews are sent automatically" : "Not set up · saved on this device only"}</b></div>`;
}

function setLang(l) {
  state.lang = l;
  $("langEn").setAttribute("aria-pressed", l === "en"); $("langHi").setAttribute("aria-pressed", l === "hi");
  $("hiNote").hidden = l !== "hi";
  state.rate = l === "hi" ? 0.95 : 1; $("rate").value = state.rate; $("rateVal").textContent = state.rate.toFixed(2) + "×";
  fillVoices(); renderAI(AI.aiState);
}

// ---------------- question UI ----------------
function setMic(mode) {
  const m = $("micBtn"); m.className = "mic " + mode;
  const txt = { listening: state.lang === "hi" ? "सुन रही हूँ… बोलिए" : "Listening… go ahead", speaking: state.lang === "hi" ? "सवाल पढ़ा जा रहा है…" : "Reading the question…", idle: V.canListen && state.voiceOn ? (state.lang === "hi" ? "बोलने के लिए माइक दबाएँ, या लिखें" : "Tap the mic to speak, or type below") : (state.lang === "hi" ? "नीचे लिखें या विकल्प चुनें" : "Type below or tap an option"), off: state.lang === "hi" ? "आवाज़ बंद है: नीचे लिखें" : "Voice input is off: type below", thinking: "…" }[mode] || "";
  $("statusTxt").textContent = txt;
}
function showTranscript(s, interim) { const t = $("transcript"); t.textContent = s || ""; t.classList.toggle("interim", !!interim); }
function hint(s) { $("hint").textContent = s || ""; }

function renderProgress(q) {
  const cur = STAGE_ORDER.indexOf(q.stage);
  $("stages").innerHTML = STAGE_ORDER.filter(s => s !== "about").map((s, i) => {
    const idx = STAGE_ORDER.indexOf(s);
    const cls = s === q.stage ? "on" : idx < cur ? "done" : "";
    return `<span class="${cls}" style="--c:var(--${s})">${tr(STAGES[s])}</span>`;
  }).join("");
  const pos = ASKED.indexOf(q); $("barFill").style.width = `${Math.max(2, ((pos < 0 ? FLOW.indexOf(q) / FLOW.length * ASKED.length : pos) / ASKED.length) * 100)}%`;
}

function renderQuestion(q) {
  $("card").style.setProperty("--c", `var(--${q.stage})`);
  $("qStage").textContent = tr(STAGES[q.stage]);
  const qt = $("qText"); qt.textContent = textOf(q); qt.lang = state.lang;
  $("qFollow").hidden = true;
  showTranscript(""); hint("");
  const opts = $("opts"); opts.innerHTML = ""; opts.classList.remove("nudge");
  $("typeBox").value = "";
  $("typeBox").placeholder = q.type === "number" ? (state.lang === "hi" ? "उम्र लिखें" : "Type your age") : (state.lang === "hi" ? "या अपना जवाब लिखें…" : "Or type your answer…");
  $("typeRow").hidden = q.type === "say";
  $("skipBtn").hidden = q.type === "say";
  if (q.type === "choice" || q.type === "multi") {
    const sel = new Set();
    for (const o of q.options) {
      const b = document.createElement("button");
      b.className = "opt"; b.textContent = tr({ en: o.en, hi: o.hi }); b.setAttribute("aria-pressed", "false");
      b.onclick = () => {
        if (q.type === "choice") return state.pending?.resolve({ value: o.v, via: "tap" });
        if (o.exclusive) { sel.clear(); opts.querySelectorAll(".opt").forEach(x => x.setAttribute("aria-pressed", "false")); }
        else { const ex = q.options.find(x => x.exclusive); if (ex) { sel.delete(ex.v); opts.querySelectorAll(".opt").forEach(x => { if (x.dataset.v === ex.v) x.setAttribute("aria-pressed", "false"); }); } }
        sel.has(o.v) ? sel.delete(o.v) : sel.add(o.v);
        b.setAttribute("aria-pressed", sel.has(o.v));
        done.hidden = !sel.size;
      };
      b.dataset.v = o.v;
      opts.appendChild(b);
    }
    const done = document.createElement("button");
    done.className = "btn"; done.textContent = state.lang === "hi" ? "हो गया" : "Done"; done.hidden = true;
    done.onclick = () => state.pending?.resolve({ values: [...sel], via: "tap" });
    if (q.type === "multi") opts.appendChild(done);
  }
  renderProgress(q);
}

// ---------------- speaking ----------------
async function say(text, my) {
  if (my !== state.run) return;
  if (!state.speakOn || !V.canSpeak) { await sleep(Math.min(2500, 400 + text.length * 25)); return; }
  setMic("speaking");
  const r = await V.speak(text, { voice: state.voice, rate: state.rate, lang: recLang() });
  if (my !== state.run) return;
  setMic("idle");
  if (r.ok) { state.ttsFails = 0; return; }
  // The device didn't read it aloud: keep going (the question is on screen) and tell the person why.
  state.ttsFails = (state.ttsFails || 0) + 1;
  hint(state.lang === "hi"
    ? "फ़ोन सवाल पढ़कर नहीं सुना पाया। सवाल ऊपर लिखा है। आवाज़ (मीडिया वॉल्यूम) बढ़ाकर 'Repeat' दबाएँ।"
    : "The device couldn't read this aloud. The question is shown above. Turn up the media volume and tap Repeat to hear it.");
  await sleep(Math.min(2500, 400 + text.length * 20));
}

// ---------------- capturing one answer (voice, typing or tapping — whichever comes first) ----------------
function capture(q, my) {
  return new Promise(resolve => {
    let settled = false, listener = null, netErrors = 0, nudged = false;
    const finish = v => {
      if (settled) return; settled = true;
      listener && listener.cancel();
      if (state.pending === handle) state.pending = null;
      if (my === state.run) setMic("idle");
      resolve(v);
    };
    const handle = { resolve: finish, relisten: () => { if (!settled) loop(); }, stopListen: () => { listener && listener.cancel(); } };
    state.pending = handle;

    const voiceUsable = () => V.canListen && state.voiceOn && !state.paused && my === state.run && !settled;
    let looping = false;
    async function loop() {
      if (looping || !voiceUsable()) { if (!voiceUsable() && my === state.run) setMic(state.voiceOn ? "idle" : "off"); return; }
      looping = true;
      let silent = 0;
      await sleep(350);
      while (voiceUsable()) {
        setMic("listening");
        const open = q.type === "open" && !q.plain;
        listener = V.listen({
          lang: recLang(),
          silenceMs: open ? 2600 : 1500,
          maxMs: open ? 90000 : 20000,
          noSpeechMs: 9000,
          onInterim: s => showTranscript(s, true),
        });
        const r = await listener.promise;
        listener = null;
        if (settled || my !== state.run || r.cancelled) break;
        if (["not-allowed", "no-mic", "unsupported", "start-failed"].includes(r.error)) {
          state.voiceOn = false; setMic("off");
          hint(r.error === "not-allowed" ? "Microphone permission was blocked. Allow it from the address bar, or keep typing." : "No microphone found. You can keep going by typing.");
          break;
        }
        if (r.error === "network") {
          if (r.text) { finish({ text: r.text, via: "voice" }); break; }
          if (++netErrors >= 2) { state.voiceOn = false; setMic("off"); hint("Speech recognition needs internet. Carry on by typing; voice will come back when you press the mic."); break; }
          continue;
        }
        if (r.text) { showTranscript(r.text); finish({ text: r.text, via: "voice" }); break; }
        silent++;
        if (silent === 1 && !nudged) { nudged = true; hint(tr(SCRIPT.silence)); await say(tr(SCRIPT.silence), my); continue; }
        if (silent >= 2) { setMic("idle"); hint(state.lang === "hi" ? "जब तैयार हों, माइक दबाकर बोलें, या नीचे लिखें।" : "When you're ready, tap the mic and speak, or type below."); break; }
      }
      looping = false;
    }
    loop();
  });
}

// ---------------- AI coding in the background ----------------
function codeInBackground(q, rec) {
  if (!q.codes || rec.plain) return;
  const isHindi = t => /[ऀ-ॿ]/.test(t || "");
  const job = (async () => {
    // Translate the answer and the follow-up separately so each English version matches its own text.
    let mainEn = rec.text, fuEn = rec.followup || "";
    if (isHindi(rec.text)) { mainEn = await AI.toEnglish(rec.text); rec.en = mainEn || null; }
    if (rec.followup && isHindi(rec.followup)) { fuEn = await AI.toEnglish(rec.followup); rec.followupEn = fuEn || null; }
    // If the first answer was vague and the follow-up carries the content, code the follow-up on its own.
    const useFollowOnly = fuEn && N.quality(rec.text) <= 2 && !(q.nowhereFollow && N.isNowhere(rec.text));
    const en = useFollowOnly ? fuEn : [mainEn, fuEn].filter(Boolean).join(". ");
    if (!en) { rec.codes = []; rec.codeNote = "needs translation"; return; }
    const qEn = (typeof q.text === "function" ? q.text(state.session.answers) : q.text).en;
    rec.codes = await AI.classify(en, q.codes, qEn);
    saveSession();
    if (!$("sEnd").hidden) renderAnswers();
  })();
  state.aiJobs.push(job);
}

// ---------------- asking one question ----------------
async function ask(q, my) {
  renderQuestion(q);
  const A = state.session.answers;
  const base = { id: q.id, stage: q.stage, asked: textOf(q), at: new Date().toISOString() };
  if (q.type === "say") { await say(textOf(q), my); await sleep(300); return; }
  await say(textOf(q), my);
  let attempts = 0;
  while (my === state.run) {
    const inp = await capture(q, my);
    if (my !== state.run) return;
    if (inp.skipped || (inp.text && N.isSkip(inp.text, SCRIPT.skipWord))) {
      A[q.id] = { ...base, kind: q.type, skipped: true }; saveSession(); return;
    }

    if (q.type === "number") {
      const n = inp.text != null ? N.parseAge(inp.text, q.min, q.max) : null;
      if (n == null) {
        attempts++; hint(tr(q.reprompt));
        if (attempts <= 2) await say(tr(q.reprompt), my);
        continue;
      }
      A[q.id] = { ...base, kind: "number", value: n, text: inp.text, via: inp.via }; saveSession();
      if (q.eligible && (n < q.eligible[0] || n > q.eligible[1])) return { end: "ineligible" };
      await say(ackLine(), my); return;
    }

    if (q.type === "choice") {
      const o = inp.value ? q.options.find(x => x.v === inp.value) : N.matchChoice(q, inp.text);
      if (!o) {
        attempts++; $("opts").classList.add("nudge"); hint(tr(SCRIPT.choiceRetry));
        if (attempts <= 2) await say(tr(SCRIPT.choiceRetry), my);
        continue;
      }
      A[q.id] = { ...base, kind: "choice", value: o.v, label: o.en, text: inp.text || null, via: inp.via }; saveSession();
      showTranscript(tr({ en: o.en, hi: o.hi }));
      await say(tr({ en: o.en, hi: o.hi }) + ".", my); return;
    }

    if (q.type === "multi") {
      let sel = inp.values ? q.options.filter(o => inp.values.includes(o.v)) : N.matchMulti(q, inp.text);
      if (!sel.length && attempts < 1) {
        attempts++; $("opts").classList.add("nudge"); hint(tr(SCRIPT.choiceRetry));
        await say(tr(SCRIPT.choiceRetry), my); continue;
      }
      A[q.id] = { ...base, kind: "multi", values: sel.map(o => o.v), labels: sel.map(o => o.en), other: sel.length ? null : inp.text, text: inp.text || null, via: inp.via };
      saveSession();
      showTranscript(sel.length ? sel.map(o => tr({ en: o.en, hi: o.hi })).join(", ") : inp.text);
      await say(ackLine(), my); return;
    }

    // open
    const text = (inp.text || "").trim();
    if (!text) { continue; }
    const rec = { ...base, kind: "open", plain: !!q.plain, text, via: inp.via, quality: q.plain ? null : N.quality(text) };
    if (!q.plain) {
      let fu = null;
      if (q.nowhereFollow && N.isNowhere(text)) fu = q.followNowhere;
      else if (rec.quality <= 1 && q.followNon) fu = q.followNon;
      else if (rec.quality <= 2 && q.followThin) fu = q.followThin;
      if (fu) {
        const fuText = tr(fu);
        $("qFollow").textContent = fuText; $("qFollow").hidden = false; showTranscript(""); hint("");
        await say(fuText, my);
        if (my !== state.run) return;
        const inp2 = await capture(q, my);
        if (my !== state.run) return;
        rec.followupQ = fuText;
        if (!inp2.skipped && inp2.text && !N.isSkip(inp2.text, SCRIPT.skipWord)) {
          rec.followup = inp2.text.trim();
          rec.quality = Math.max(rec.quality, N.quality(text + " " + rec.followup));
        }
      }
      if (q.goalSource) {
        const g = rec.quality >= 2 && N.quality(text) >= 2 ? text : rec.followup || text;
        rec.goal = N.goalPhrase(g);
      }
    }
    A[q.id] = rec; saveSession();
    codeInBackground(q, rec);
    await say(ackLine(), my); return;
  }
}
function ackLine() { const a = SCRIPT.ack[state.lang] || SCRIPT.ack.en; return a[Math.floor(Math.random() * a.length)]; }

// ---------------- running the flow ----------------
async function play(from) {
  const my = ++state.run;
  state.paused = false; $("pauseBtn").textContent = state.lang === "hi" ? "रोकें" : "Pause";
  for (let i = from; i < FLOW.length; i++) {
    if (my !== state.run) return;
    const q = FLOW[i];
    if (!visible(q)) continue;
    state.idx = i;
    const r = await ask(q, my);
    if (my !== state.run) return;
    if (r && r.end) return finish(r.end, my);
  }
  if (my === state.run) finish("complete", my);
}
function stopAll() { state.run++; V.stopSpeaking(); if (state.pending) { const p = state.pending; state.pending = null; p.resolve({ cancelled: true }); } }

function prevIndex(i) {
  for (let j = i - 1; j >= 0; j--) if (FLOW[j].type !== "say" && visible(FLOW[j])) return j;
  return i;
}

async function finish(reason, my) {
  const s = state.session;
  s.status = reason; s.ended = new Date().toISOString();
  s.profile = N.profile(s.answers);
  saveSession();
  show("sEnd");
  $("endTitle").textContent = reason === "ineligible" ? (state.lang === "hi" ? "धन्यवाद!" : "Thank you!") : (state.lang === "hi" ? "बहुत-बहुत धन्यवाद!" : "Thank you for sharing your voice!");
  $("endText").textContent = tr(reason === "ineligible" ? SCRIPT.ineligible : SCRIPT.end);
  $("profilePanel").hidden = reason === "ineligible";
  renderProfile(); renderAnswers();
  say(tr(reason === "ineligible" ? SCRIPT.ineligible : SCRIPT.end), my);
  if (reason !== "ineligible") makeSummary();
}

// ---------------- summary screen ----------------
const SEG_NOTE = {
  "On track": "Has a clear goal and a concrete next step. Check that they can get the access and money to keep going.",
  "Dreamer without a map": "Knows what they want but not how to get there. Career guidance and information would help most.",
  "Following a set track": "Has a path (a course or exam) but no clear picture of why. Help connecting it to their own interests.",
  "Still exploring": "No clear goal yet. Exposure to different kinds of work and role models would help.",
};
function renderProfile() {
  const p = state.session.profile;
  $("segment").textContent = p.segment;
  $("blocked").hidden = !p.blocked;
  $("segNote").textContent = SEG_NOTE[p.segment] + (p.blocked ? " Flagged as Blocked: no current access to learning plus a structural barrier (money, distance, safety or family)." : "");
  const D = [["Vision clarity", "vision", "dream"], ["Purpose", "purpose", "dream"], ["Confidence", "agency", "belief"], ["Pathway clarity", "pathway", "path"], ["Access", "access", "path"], ["Support", "support", "support"]];
  $("dims").innerHTML = D.map(([lab, k, c]) => {
    const v = p[k];
    return `<div class="dim" style="--c:var(--${c})"><span>${lab}</span><div class="track" role="img" aria-label="${lab} ${v ?? "not answered"} of 2"><i class="${v >= 1 ? "on" : ""}"></i><i class="${v >= 2 ? "on" : ""}"></i></div><b>${v == null ? "–" : v + "/2"}</b></div>`;
  }).join("") + `<div class="small">Voice Quality Index: <b>${p.vqi ?? "–"}</b> of 4 (average quality of open answers)</div>`;
}
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function answerText(a) {
  if (!a) return "<span class='muted'>not asked</span>";
  if (a.skipped) return "<span class='muted'>skipped</span>";
  if (a.kind === "choice") return esc(a.label);
  if (a.kind === "multi") return esc(a.labels.length ? a.labels.join(", ") : "Other: " + (a.other || ""));
  if (a.kind === "number") return esc(a.value);
  let h = esc(a.text);
  if (a.followup) h += `<br><span class="small">↳ ${esc(a.followupQ)} <b>${esc(a.followup)}</b></span>`;
  if (a.en && a.en !== a.text) h += `<br><span class="small muted">EN (machine translation): ${esc(a.en)}${a.followupEn ? " — " + esc(a.followupEn) : ""}</span>`;
  return h;
}
function renderAnswers() {
  const A = state.session.answers;
  $("ansBody").innerHTML = ASKED.filter(q => A[q.id]).map(q => {
    const a = A[q.id];
    const ql = a.quality == null ? "" : `<b class="q${a.quality}">${a.quality}</b>`;
    const codes = a.codes ? (a.codes.length ? a.codes.map(c => `<span class="code" title="${c.score}">${esc(c.label)}${c.weak ? "?" : ""}</span>`).join("") : `<span class="muted small">${a.codeNote || "–"}</span>`) : (q.codes && !a.skipped ? `<span class="muted small">working…</span>` : "");
    return `<tr><td><b>${q.id}</b></td><td>${answerText(a)}</td><td>${ql}</td><td>${codes}</td></tr>`;
  }).join("");
}
async function makeSummary() {
  const A = state.session.answers;
  const g = id => A[id] && !A[id].skipped ? [A[id].en || A[id].text, A[id].followupEn || A[id].followup].filter(Boolean).join(" — ") : "";
  $("summary").textContent = "Writing summary…";
  await Promise.race([Promise.allSettled(state.aiJobs), sleep(8000)]);
  const facts = `Future work: ${g("F1")}\nWhy: ${g("F2")}\nGood life: ${g("F3")}\nConfidence: ${A.F4?.label || ""}\nBiggest barrier: ${g("F5")}\nNext step: ${g("F6")}\nLearning now from: ${g("F7")}\nAdvice from: ${(A.F8?.labels || []).join(", ")}\nHelp wanted: ${g("F9")}\nOne change: ${g("F10")}`;
  let text = await AI.summarise(facts), src = "Written by the browser's built-in on-device AI. Check it against the answers.";
  if (!text) {
    const parts = [];
    const why = g("F2").replace(/^\s*(because|cause|as|क्योंकि)\s+/i, "");
    if (g("F1")) parts.push(`Wants to be doing: “${g("F1")}”${why ? `, because “${why}”` : ""}.`);
    if (A.F4?.label) parts.push(`${A.F4.label}${g("F5") ? `; biggest barrier: “${g("F5")}”` : ""}.`);
    if (g("F6")) parts.push(`Next step: “${g("F6")}”.`);
    if (g("F9")) parts.push(`Help wanted: “${g("F9")}”.`);
    text = parts.join(" ") || "Not enough answers for a summary.";
    src = "Built from the answers using rules (on-device AI summary not available in this browser).";
  }
  state.session.summary = text; state.session.summarySource = src; saveSession();
  $("summary").textContent = text; $("summarySrc").textContent = src;
  renderAnswers();
  syncPending();
}

// ---------------- downloads ----------------
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function csvCell(v) { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
const COLS = (() => {
  const c = ["session_id", "started", "ended", "language", "status"];
  for (const q of ASKED) c.push(q.id, `${q.id}_followup`, `${q.id}_quality`, `${q.id}_english`, `${q.id}_ai_themes`, `${q.id}_via`);
  c.push("vision_clarity", "purpose", "confidence", "pathway_clarity", "access", "support", "segment", "blocked", "voice_quality_index", "summary");
  return c;
})();
function rowOf(s) {
  const r = [s.id, s.started, s.ended, s.lang, s.status];
  for (const q of ASKED) {
    const a = s.answers[q.id];
    const val = !a ? "" : a.skipped ? "(skipped)" : a.kind === "choice" ? a.value : a.kind === "multi" ? (a.values.join("|") || "other:" + (a.other || "")) : a.kind === "number" ? a.value : a.text;
    r.push(val, a?.followup || "", a?.quality ?? "", [a?.en && a.en !== a.text ? a.en : "", a?.followupEn || ""].filter(Boolean).join(" — "), (a?.codes || []).map(c => c.label).join("|"), a?.via || "");
  }
  const p = s.profile || {};
  r.push(p.vision, p.purpose, p.agency, p.pathway, p.access, p.support, p.segment, p.blocked, p.vqi, s.summary || "");
  return r.map(v => (v == null ? "" : v));
}
function toCSV(list) {
  const rows = [COLS, ...list.map(rowOf)];
  return "\uFEFF" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");
}

// ---------------- Google Sheet sync ----------------
// Sends each finished interview to a Google Apps Script web app, which adds or updates one row
// per session_id. Unsent or changed interviews are retried on load, when back online, and every minute.
let syncing = false;
async function syncPending() {
  if (!SHEET_URL || syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const due = loadAll().filter(s => s.status !== "in progress" && (!s.syncedAt || s.syncedAt < (s.updatedAt || "")));
    for (const s of due) {
      const stamp = new Date().toISOString();
      try {
        await fetch(SHEET_URL, {
          method: "POST", mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ tool: "Youth Voice v2", columns: COLS, values: rowOf(s) }),
        });
      } catch { break; } // offline or blocked: try again later
      const all = loadAll();
      const t = all.find(x => x.id === s.id);
      if (t) { t.syncedAt = stamp; try { localStorage.setItem(STORE, JSON.stringify(all)); } catch {} }
      if (state.session && state.session.id === s.id) state.session.syncedAt = stamp;
    }
  } finally { syncing = false; }
  if (!$("sSessions").hidden) renderSessions();
}
function renderSessions() {
  const all = loadAll().sort((a, b) => (b.started || "").localeCompare(a.started || ""));
  $("sessBody").innerHTML = all.length ? all.map(s => `<tr><td>${esc(new Date(s.started).toLocaleString())}</td><td>${s.lang === "hi" ? "Hindi" : "English"}</td><td>${esc(s.status)}</td><td>${esc(s.profile?.segment || "–")}</td><td>${esc(s.answers?.F1?.goal || "")}</td><td>${!SHEET_URL ? "–" : s.syncedAt && s.syncedAt >= (s.updatedAt || "") ? "Sent" : s.status === "in progress" ? "Not finished" : "Waiting"}</td></tr>`).join("") : `<tr><td colspan="6" class="muted">No interviews saved yet. Finished and unfinished interviews will appear here.</td></tr>`;
}

// ---------------- wiring ----------------
function newSession() {
  state.session = { id: "YV-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(), started: new Date().toISOString(), lang: state.lang, status: "in progress", answers: {}, tool: "Youth Voice v2" };
  state.aiJobs = [];
}
function wire() {
  $("langEn").onclick = () => setLang("en");
  $("langHi").onclick = () => setLang("hi");
  $("voiceSel").onchange = e => { state.voice = V.voicesFor(recLang()).find(v => v.name === e.target.value) || null; renderAI(AI.aiState); };
  $("rate").oninput = e => { state.rate = +e.target.value; $("rateVal").textContent = state.rate.toFixed(2) + "×"; };
  $("testVoice").onclick = () => { V.unlockSpeech(); V.speak(state.lang === "hi" ? "नमस्ते! मैं आपसे आपके भविष्य के बारे में कुछ सवाल पूछूँगी।" : "Hello! I'll ask you a few questions about your future.", { voice: state.voice, rate: state.rate, lang: recLang() }).then(r => { if (!r.ok) $("micResult").textContent = "This device didn't play the voice. Check the media volume, or try Microsoft Edge."; }); };
  $("testMic").onclick = async () => {
    if (!V.canListen) { $("micResult").textContent = "Speech recognition isn't available here. Use Microsoft Edge."; return; }
    $("micResult").textContent = "Say something…";
    const r = await V.listen({ lang: recLang(), silenceMs: 1500, maxMs: 8000, noSpeechMs: 6000, onInterim: s => ($("micResult").textContent = "Heard: " + s) }).promise;
    $("micResult").textContent = r.error ? (r.error === "not-allowed" ? "Microphone blocked: allow it from the lock icon in the address bar." : "Problem: " + r.error) : r.text ? "Heard: “" + r.text + "” ✓" : "Didn't hear anything. Check the microphone.";
  };
  $("startBtn").onclick = () => {
    V.unlockSpeech();
    state.voiceOn = !$("typeOnly").checked; state.speakOn = true;
    $("muteBtn").textContent = state.lang === "hi" ? "आवाज़ चालू" : "Voice on";
    newSession(); saveSession(); show("sQ"); play(0);
  };
  $("sendBtn").onclick = () => { const v = $("typeBox").value.trim(); if (v && state.pending) state.pending.resolve({ text: v, via: "typed" }); };
  $("typeBox").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("sendBtn").click(); } });
  // Clicking into the box means the person wants to type: stop listening so speech can't overwrite it.
  $("typeBox").addEventListener("focus", () => state.pending?.stopListen());
  $("micBtn").onclick = () => { if (!V.canListen) return hint("Voice input needs Microsoft Edge."); state.voiceOn = true; if (state.pending) { V.stopSpeaking(); state.pending.relisten(); } };
  ["repeatBtn", "backBtn", "pauseBtn", "skipBtn", "sendBtn"].forEach(id => $(id).addEventListener("click", () => V.unlockSpeech(), true));
  $("skipBtn").onclick = () => state.pending?.resolve({ skipped: true });
  $("repeatBtn").onclick = () => { stopAll(); play(state.idx); };
  $("backBtn").onclick = () => { const p = prevIndex(state.idx); stopAll(); play(p); };
  $("pauseBtn").onclick = () => {
    if (!state.paused) { stopAll(); state.paused = true; setMic("idle"); $("statusTxt").textContent = state.lang === "hi" ? "रुका हुआ है" : "Paused"; $("pauseBtn").textContent = state.lang === "hi" ? "जारी रखें" : "Resume"; }
    else { play(state.idx); }
  };
  $("muteBtn").onclick = () => {
    state.speakOn = !state.speakOn; if (!state.speakOn) V.stopSpeaking();
    $("muteBtn").setAttribute("aria-pressed", !state.speakOn);
    $("muteBtn").textContent = state.speakOn ? (state.lang === "hi" ? "आवाज़ चालू" : "Voice on") : (state.lang === "hi" ? "आवाज़ बंद" : "Voice off");
  };
  $("newBtn").onclick = () => { stopAll(); show("sStart"); };
  $("dlOne").onclick = () => download(`${state.session.id}.json`, JSON.stringify(state.session, null, 2), "application/json");
  $("navSessions").onclick = () => { stopAll(); renderSessions(); show("sSessions"); };
  $("backHome").onclick = () => show("sStart");
  $("dlCsv").onclick = () => download(`youth_voice_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(loadAll()), "text/csv;charset=utf-8");
  $("syncNow").onclick = async () => { $("syncNow").textContent = "Sending…"; await syncPending(); $("syncNow").textContent = "Send to Google Sheet now"; };
  $("syncNow").hidden = !SHEET_URL;
  window.addEventListener("online", syncPending);
  setInterval(syncPending, 60000);
  $("dlJson").onclick = () => download(`youth_voice_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(loadAll(), null, 2), "application/json");
  $("clearAll").onclick = () => ($("clearConfirm").hidden = false);
  $("clearNo").onclick = () => ($("clearConfirm").hidden = true);
  $("clearYes").onclick = () => { try { localStorage.removeItem(STORE); } catch {} $("clearConfirm").hidden = true; renderSessions(); };
  window.addEventListener("beforeunload", saveSession);
}

$("ver").textContent = VERSION;
window.__yv = { state, FLOW }; // read-only hook for automated tests
wire();
initStart();
syncPending();
