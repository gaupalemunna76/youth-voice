// Voice engine: Microsoft Edge text-to-speech (speechSynthesis, "Online (Natural)" voices)
// and Edge speech recognition (webkitSpeechRecognition). Every call has a timeout so the
// survey can never get stuck waiting on the browser.

const synth = window.speechSynthesis;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canSpeak = !!synth;
export const canListen = !!SR;

let voices = [];
export function loadVoices() {
  return new Promise(res => {
    if (!synth) return res([]);
    const done = () => { voices = synth.getVoices(); res(voices); };
    voices = synth.getVoices();
    if (voices.length) return res(voices);
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 2500);
  });
}

export function voicesFor(lang) {
  const base = lang.split("-")[0];
  return voices.filter(v => v.lang.replace("_", "-").toLowerCase().startsWith(base));
}

export function pickVoice(lang) {
  const list = voicesFor(lang);
  const rank = v => {
    let s = 0;
    if (/natural/i.test(v.name)) s += 100;
    if (/microsoft/i.test(v.name)) s += 20;
    if (v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) s += 50;
    if (/neerja|swara|aarav|madhur|prabhat/i.test(v.name)) s += 10;
    return s;
  };
  return list.sort((a, b) => rank(b) - rank(a))[0] || null;
}

let speakToken = 0;
export function stopSpeaking() { speakToken++; try { synth && synth.cancel(); } catch {} }

export function speak(text, { voice, rate = 1, lang } = {}) {
  return new Promise(resolve => {
    if (!synth || !text) return resolve();
    stopSpeaking();
    const my = speakToken;
    const u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else if (lang) u.lang = lang;
    u.rate = rate;
    let finished = false;
    const finish = () => { if (finished) return; finished = true; clearTimeout(dog); clearInterval(keep); resolve(); };
    u.onend = finish; u.onerror = finish;
    // Watchdog: some voices never fire onend. Allow ~85 ms per character at rate 1, plus slack.
    const dog = setTimeout(finish, Math.max(4000, (text.length * 85) / rate + 3000));
    // Keep long utterances alive (Chromium can pause after ~15 s).
    const keep = setInterval(() => { if (my !== speakToken) return finish(); if (synth.paused) synth.resume(); }, 5000);
    setTimeout(() => { if (my === speakToken) synth.speak(u); else finish(); }, 60);
  });
}

// One listening turn. Resolves with { text } (possibly ""), or { error }.
export function listen({ lang = "en-IN", silenceMs = 2200, maxMs = 60000, noSpeechMs = 9000, onInterim } = {}) {
  let cancel = () => {};
  const promise = new Promise(resolve => {
    if (!SR) return resolve({ error: "unsupported" });
    let finals = "", interim = "", done = false, rec = null, restarts = 0, heard = false;
    let silenceTimer = null;
    const started = Date.now();
    const finish = r => {
      if (done) return; done = true;
      clearTimeout(silenceTimer); clearTimeout(maxTimer); clearTimeout(noSpeechTimer);
      try { rec && rec.abort(); } catch {}
      resolve(r);
    };
    const text = () => (finals + " " + interim).replace(/\s+/g, " ").trim();
    const armSilence = () => { clearTimeout(silenceTimer); silenceTimer = setTimeout(() => finish({ text: text() }), silenceMs); };
    const maxTimer = setTimeout(() => finish({ text: text() }), maxMs);
    const noSpeechTimer = setTimeout(() => { if (!heard) finish({ text: "" }); }, noSpeechMs);

    const start = () => {
      rec = new SR();
      rec.lang = lang; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
      rec.onresult = e => {
        heard = true;
        interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finals += " " + r[0].transcript; else interim += " " + r[0].transcript;
        }
        onInterim && onInterim(text());
        armSilence();
      };
      rec.onerror = e => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") return finish({ error: "not-allowed" });
        if (e.error === "network") return finish({ error: "network", text: text() });
        if (e.error === "audio-capture") return finish({ error: "no-mic" });
        // "no-speech" and "aborted" are handled by onend / timers
      };
      rec.onend = () => {
        if (done) return;
        // Edge ends recognition on its own after a pause; keep listening until our own timers decide.
        if (restarts < 15 && Date.now() - started < maxMs) { restarts++; if (interim) { finals += " " + interim; interim = ""; } try { start(); } catch { finish({ text: text() }); } }
        else finish({ text: text() });
      };
      try { rec.start(); } catch (e) { finish({ error: "start-failed" }); }
    };
    start();
    cancel = () => finish({ cancelled: true, text: text() });
  });
  return { promise, cancel: () => cancel() };
}
