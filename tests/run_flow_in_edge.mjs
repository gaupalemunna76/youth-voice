// Drive headless Edge over the DevTools protocol and wait in real time for the flow test to finish.
import { spawn } from "node:child_process";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const url = process.argv[2];
const prof = process.argv[3];
const p = spawn(EDGE, ["--headless=new", "--disable-gpu", "--mute-audio", "--remote-debugging-port=9333", `--user-data-dir=${prof}`, url], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40 && !ws; i++) {
  await sleep(500);
  try {
    const list = await (await fetch("http://127.0.0.1:9333/json")).json();
    const page = list.find(x => x.type === "page" && x.url.includes("flowtest"));
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
}
await new Promise(r => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const ev = expr => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true } })); });
const t0 = Date.now();
while (Date.now() - t0 < 520000) {
  await sleep(3000);
  const r = await ev("document.title + '\\u0001' + document.getElementById('out').textContent");
  const [title, text] = String(r.result?.result?.value || "").split("\u0001");
  if (title === "done") { console.log(text); break; }
}
ws.close(); p.kill();
process.exit(0);
