import { FLOW } from "../questions.js";
import * as N from "../nlp.js";
const Q = id => FLOW.find(q => q.id === id);
const c = (id, s) => { const m = N.matchChoice(Q(id), s); return m ? m.v : null; };
const mm = s => N.matchMulti(Q("F8"), s).map(o => o.v).join(",");
const tests = [
 ["age", N.parseAge("I am twenty three years old"), 23], ["age", N.parseAge("मेरी उम्र उन्नीस साल है"), 19], ["age", N.parseAge("२१"), 21], ["age", N.parseAge("Hi"), null], ["age", N.parseAge("19 years"), 19],
 ["A2", c("A2", "I am a female"), "female"], ["A2", c("A2", "woman"), "female"], ["A2", c("A2", "लड़का"), "male"], ["A2", c("A2", "man"), "male"],
 ["A4", c("A4", "both studying and working"), "both"], ["A4", c("A4", "I am looking for work"), "looking"], ["A4", c("A4", "not studying or working"), "neither"], ["A4", c("A4", "मैं पढ़ाई कर रही हूँ"), "studying"],
 ["A6", c("A6", "government aided"), "aided"], ["A6", c("A6", "sarkari"), "government"], ["A6", c("A6", "private college"), "private"],
 ["F4", c("F4", "I am not very sure"), "not"], ["F4", c("F4", "very sure"), "very"], ["F4", c("F4", "थोड़ा भरोसा"), "somewhat"], ["F4", c("F4", "भरोसा नहीं"), "not"],
 ["C1", c("C1", "नहीं बताना चाहती"), "pnts"], ["C1", c("C1", "no"), "no"], ["C1", c("C1", "yes I have"), "yes"],
 ["C2", c("C2", "15000"), "10-25k"], ["C2", c("C2", "around 20 thousand"), "10-25k"], ["C2", c("C2", "10 to 25 thousand"), "10-25k"], ["C2", c("C2", "under 10 thousand"), "lt10k"], ["C2", c("C2", "1 लाख से ज़्यादा"), "gt1l"], ["C2", c("C2", "पता नहीं"), "dk"], ["C2", c("C2", "50 thousand to 1 lakh"), "50k-1l"], ["C2", c("C2", "8000"), "lt10k"],
 ["F8", mm("my parents and teachers and youtube"), "family,teachers,internet"], ["F8", mm("nobody"), "nobody"], ["F8", mm("I said chatgpt"), "ai"],
 ["q", N.quality("Yes"), 1], ["q", N.quality("hard work"), 2], ["q", N.quality("Teacher"), 2], ["q", N.quality("I want to become a nurse in a government hospital"), 3],
 ["q", N.quality("I want to be a teacher because in my village girls stop school and I want to change that for them"), 4], ["q", N.quality("पता नहीं"), 1], ["q", N.quality("मेहनत"), 2],
 ["nowhere", N.isNowhere("nowhere right now"), true], ["skip", N.isSkip("skip", ["skip"]), true],
];
let f = 0; for (const [n, got, exp] of tests) if (got !== exp) { f++; console.log("FAIL", n, JSON.stringify(got), "expected", exp); }
console.log(tests.length - f, "/", tests.length, "passed");
