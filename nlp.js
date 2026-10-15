// Rule-based language helpers: numbers, option matching, answer quality, Future Vision Profile.
// Pure functions (no DOM) so they can be tested with node.

const DEVA = "०१२३४५६७८९";
export function normalize(s) {
  return String(s || "")
    .replace(/[०-९]/g, d => String(DEVA.indexOf(d)))
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[.,!?;:()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EN_ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const EN_TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const HI_NUM = { "दस": 10, "ग्यारह": 11, "बारह": 12, "तेरह": 13, "चौदह": 14, "पंद्रह": 15, "पन्द्रह": 15, "सोलह": 16, "सत्रह": 17, "अठारह": 18, "उन्नीस": 19, "बीस": 20, "इक्कीस": 21, "बाईस": 22, "तेईस": 23, "चौबीस": 24, "पच्चीस": 25, "छब्बीस": 26, "सत्ताईस": 27, "अट्ठाईस": 28, "अठाईस": 28, "उनतीस": 29, "तीस": 30, "इकतीस": 31, "बत्तीस": 32, "तैंतीस": 33, "चौंतीस": 34, "पैंतीस": 35, "छत्तीस": 36, "सैंतीस": 37, "अड़तीस": 38, "उनतालीस": 39, "चालीस": 40, "पचास": 50, "एक": 1, "दो": 2, "पाँच": 5, "पांच": 5 };

// All numbers in a string, in order (digits, English words, Hindi words).
export function numbersIn(text) {
  const t = normalize(text).replace(/(\d),(\d)/g, "$1$2");
  const out = [];
  const tokens = t.split(/[\s-]+/);
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    if (/^\d+(\.\d+)?$/.test(w)) { out.push({ n: parseFloat(w), i }); continue; }
    const m = w.match(/^(\d+)(k|years?|yrs?|th|st|nd|rd)$/);
    if (m) { out.push({ n: parseInt(m[1]) * (m[2] === "k" ? 1000 : 1), i }); continue; }
    if (w in EN_TENS) {
      let n = EN_TENS[w];
      if (tokens[i + 1] in EN_ONES && EN_ONES[tokens[i + 1]] < 10) { n += EN_ONES[tokens[i + 1]]; i++; }
      out.push({ n, i }); continue;
    }
    if (w in EN_ONES) { out.push({ n: EN_ONES[w], i }); continue; }
    if (w in HI_NUM) { out.push({ n: HI_NUM[w], i }); continue; }
  }
  return out;
}

export function parseAge(text, min = 10, max = 60) {
  const nums = numbersIn(text).map(x => x.n).filter(n => Number.isInteger(n) && n >= min && n <= max);
  return nums.length ? nums[0] : null;
}

// Money: understands "15000", "15 thousand", "15 हज़ार", "1 lakh", "10 to 25 thousand", "under 10".
export function parseMoney(text) {
  const t = normalize(text);
  const toks = t.split(/[\s-]+/);
  const vals = [];
  for (const { n, i } of numbersIn(t)) {
    const next = toks.slice(i + 1, i + 3).join(" ");
    let v = n;
    if (/^(lakh|lac|lakhs|लाख)/.test(next)) v = n * 100000;
    else if (/^(thousand|k\b|हज़ार|हजार|hazar|hajar)/.test(next)) v = n * 1000;
    else if (n < 1000) v = null; // unit decided below
    vals.push({ n, v });
  }
  if (!vals.length) return null;
  const hasLakh = /(lakh|lac|लाख)/.test(t), hasK = /(thousand|हज़ार|हजार|hazar|hajar)/.test(t);
  const resolved = vals.map(x => x.v ?? (hasLakh && !hasK ? x.n * 100000 : x.n * 1000));
  let value;
  if (resolved.length >= 2 && resolved[1] > resolved[0]) value = (resolved[0] + resolved[1]) / 2;
  else value = resolved[0];
  if (/(under|less|below|कम)/.test(t)) value = value - 1;
  else if (/(over|more|above|ज़्यादा|ज्यादा|अधिक)/.test(t)) value = value + 1;
  return value;
}

function hit(text, syn) {
  const s = normalize(syn);
  if (!s) return false;
  if (/^[a-z0-9' ]+$/.test(s)) {
    const re = new RegExp(`(^|[^a-z])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es)?($|[^a-z])`);
    return re.test(text);
  }
  return text.includes(s);
}

// Best single option, or null. Higher priority (p) wins, then longer synonym.
export function matchChoice(q, text) {
  const t = normalize(text);
  if (!t) return null;
  if (q.money) {
    for (const o of [...q.options].sort((a, b) => (b.p || 0) - (a.p || 0))) {
      if (o.syn.some(s => hit(t, s))) return o;
    }
    const v = parseMoney(t);
    if (v != null) return q.options.find(o => o.lo != null && v >= o.lo && v <= o.hi_) || null;
    return null;
  }
  let best = null, bestScore = -1;
  for (const o of q.options) {
    for (const s of [...o.syn, o.en, o.hi]) {
      if (s && hit(t, s)) {
        const score = (o.p || 0) * 1000 + normalize(s).length;
        if (score > bestScore) { best = o; bestScore = score; }
      }
    }
  }
  return best;
}

export function matchMulti(q, text) {
  const t = normalize(text);
  const found = q.options.filter(o => [...o.syn, o.en, o.hi].some(s => s && hit(t, s)));
  const excl = found.find(o => o.exclusive);
  if (excl && found.length === 1) return [excl];
  return found.filter(o => !o.exclusive || found.length === 1);
}

const NON = ["yes", "no", "ok", "okay", "yeah", "nothing", "don't know", "dont know", "no idea", "not sure", "nope", "maybe", "हाँ", "हां", "नहीं", "पता नहीं", "कुछ नहीं", "मालूम नहीं", "ठीक है", "जी"];
const GENERIC = ["hard work", "work hard", "education", "study", "studies", "good", "good life", "happy", "happiness", "support", "skills", "skill", "learning", "knowledge", "job", "money", "success", "better", "help", "guidance", "मेहनत", "पढ़ाई", "अच्छा", "अच्छी", "खुश", "शिक्षा", "नौकरी", "पैसा", "सफलता", "मदद"];
const REASON = ["because", "so that", "but", "since", "as i", "which", "if ", "क्योंकि", "ताकि", "लेकिन", "पर ", "इसलिए", "अगर", "जिससे"];
const NOWHERE = ["nowhere", "not learning", "no where", "not yet", "nobody", "no one", "none", "कहीं नहीं", "कहीं से नहीं", "अभी नहीं", "कोई नहीं", "नहीं सीख"];

export function isSkip(text, skipWords) {
  const t = normalize(text);
  return skipWords.some(w => t === normalize(w) || t === "please " + normalize(w));
}

// 0 off/blank · 1 non-answer · 2 thin · 3 clear · 4 rich  (mirrors the review rubric)
export function quality(text) {
  const t = normalize(text);
  if (!t) return 0;
  const words = t.split(" ").filter(Boolean);
  const stripped = t.replace(/^(i think|i want|i would|i will|maybe|मुझे|मैं)\s*/, "");
  if (NON.some(n => stripped === n || stripped === n + " " + n) || words.length === 1 && NON.includes(words[0])) return 1;
  const genericOnly = words.length <= 4 && GENERIC.some(g => t.includes(g)) &&
    t.replace(new RegExp(GENERIC.map(g => g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g"), "").replace(/\b(and|or|a|the|to|be|in|more|very|और|बहुत|से|की|का|के)\b/g, "").trim().length < 4;
  if (genericOnly) return 2;
  if (words.length <= 2) return 2;
  const hasReason = REASON.some(r => t.includes(r));
  if (words.length >= 12 && hasReason) return 4;
  return 3;
}

export function isNowhere(text) {
  const t = normalize(text);
  return NOWHERE.some(n => t.includes(n)) && t.split(" ").length <= 8;
}

// Short goal phrase to repeat back in F6.
export function goalPhrase(text) {
  const t = String(text || "").trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
  if (!t) return null;
  const words = t.split(" ");
  return words.length <= 10 ? t : words.slice(0, 10).join(" ") + "…";
}

// ---------- Future Vision Profile ----------
const FAMILY_SOC = ["family", "parent", "mother", "father", "society", "community", "people", "village", "country", "poor", "children", "others", "help", "परिवार", "माता", "पिता", "माँ", "समाज", "गाँव", "गांव", "देश", "लोग", "बच्चों", "दूसरों", "मदद", "सेवा"];
const STRUCTURED = ["school", "college", "university", "coaching", "institute", "class", "course", "training", "office", "ngo", "workplace", "company", "internship", "teacher", "स्कूल", "कॉलेज", "कोचिंग", "संस्थान", "ट्रेनिंग", "कोर्स", "ऑफिस", "संस्था", "क्लास", "टीचर"];
const STRUCT_BARRIER = ["money", "fee", "afford", "poor", "financial", "village", "far", "distance", "transport", "safety", "safe", "girl", "marriage", "family", "parents", "permission", "पैसा", "पैसे", "फीस", "गरीब", "आर्थिक", "गाँव", "गांव", "दूर", "सुरक्षा", "लड़की", "शादी", "परिवार", "घर वाले"];

const has = (text, list) => { const t = normalize(text); return list.some(w => t.includes(normalize(w))); };
const ansText = a => a ? [a.text, a.followup].filter(Boolean).join(" ") : "";

export function profile(A) {
  const q = id => A[id]?.quality ?? 0;
  const f1 = q("F1"), f3 = q("F3");
  const vision = f1 >= 3 && f3 >= 3 ? 2 : (f1 >= 2 || f3 >= 2) ? 1 : 0;
  const purpose = q("F2") <= 1 ? 0 : has(ansText(A.F2), FAMILY_SOC) ? 2 : 1;
  const agency = { very: 2, somewhat: 1, not: 0 }[A.F4?.value] ?? null;
  const pathway = q("F6") >= 3 ? 2 : q("F6") === 2 ? 1 : 0;
  const f7 = ansText(A.F7);
  const access = !A.F7 || A.F7.skipped ? null : (isNowhere(A.F7.text) ? 0 : has(f7, STRUCTURED) ? 2 : 1);
  const sel = A.F8?.values || [];
  const support = !A.F8 || A.F8.skipped ? null : sel.includes("nobody") || sel.length === 0 ? 0
    : (sel.length >= 2 && sel.some(v => ["family", "teachers", "friends", "work"].includes(v))) ? 2 : 1;
  let segment;
  if (vision === 2 && pathway === 2) segment = "On track";
  else if (vision === 2) segment = "Dreamer without a map";
  else if (pathway === 2) segment = "Following a set track";
  else segment = "Still exploring";
  const structBarrier = has(ansText(A.F5) + " " + (A.F7?.followup || ""), STRUCT_BARRIER);
  const blocked = vision === 2 && access === 0 && structBarrier;
  const opens = Object.values(A).filter(a => a && a.kind === "open" && !a.plain && !a.skipped);
  const vqi = opens.length ? +(opens.reduce((s, a) => s + (a.quality || 0), 0) / opens.length).toFixed(2) : null;
  return { vision, purpose, agency, pathway, access, support, segment, blocked, structBarrier, vqi };
}
