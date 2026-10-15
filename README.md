# Youth Voice — voice survey tool (Youth Questionnaire v2)

A voice conversation that runs in **Microsoft Edge**. It reads each question aloud in a Microsoft Natural voice, listens to the answer, asks one follow-up when an answer is vague, and builds a Future Vision Profile at the end.

## Start it
**Live version:** open **https://gaupalemunna76.github.io/youth-voice/** in Microsoft Edge on any laptop (or Edge or Chrome on Android). No install is needed.

**On this computer without internet hosting:** double-click **start.bat**. A small black window opens (keep it open) and Edge opens at http://localhost:8765. To stop, close the black window.

Then pick **English** or **हिंदी**, press **Test microphone**, allow the microphone when Edge asks, and press **Start interview**.

## Collect every interview in one Google Sheet (one-time setup, about 5 minutes)
1. Create a new Google Sheet, for example "Youth Voice responses".
2. In the Sheet: **Extensions → Apps Script**. Delete what is there, paste everything from `google_sheet/Code.gs`, and press **Save**.
3. **Deploy → New deployment →** gear icon **→ Web app**. Set *Execute as*: **Me** and *Who has access*: **Anyone**. Press **Deploy**, allow access when Google asks, and copy the **Web app URL** (it ends in `/exec`).
4. Put that URL in `config.js` (`SHEET_URL = "…/exec"`) and publish the change. From then on, every finished interview is sent to the "Youth Voice" tab: one row per interview, updated if the interview changes. If a device is offline, it retries later.

The web-app URL accepts only rows in the tool's exact format, and answers are stored as plain text (never as formulas). Anyone who has the URL could still send fake rows, so share the tool link, not the script URL.

## During an interview
- **The flow runs by itself:** question spoken → microphone listens → answer saved → next question. A pause of about 2.5 seconds ends a spoken answer.
- **The person can always tap or type instead.** Clicking in the text box stops the microphone. Choice questions have buttons.
- **Back**, **Repeat**, **Skip**, **Pause / Resume** and **Voice on/off** are at the bottom of the card.
- If the microphone or internet fails, the tool switches to typing automatically and keeps going. Press the mic button to try voice again.
- Saying "skip" (or "छोड़ें") skips a question.
- People outside ages 15–29 are thanked and the interview ends (they belong to the General Public tool).

## Free AI features
| Feature | How it works | If unavailable |
|---|---|---|
| Natural voice | Edge's Microsoft Online (Natural) voices: Neerja (English, India), Swara (Hindi) | Uses any installed voice, or shows text only |
| Speech to text | Edge speech recognition (online) | Typing |
| Answer-quality check and smart follow-ups | Rules based on the 0–4 rubric from the v1 review | Always on |
| Theme coding | Transformers.js zero-shot model (`nli-deberta-v3-xsmall`). It runs on this PC; downloads ~87 MB once, then is cached | Answers are saved without themes |
| Hindi → English | The browser's built-in Translator AI, if this Edge version has it | Hindi answers are marked "needs translation" |
| Summary | The browser's built-in on-device language model (Prompt API), if available | Summary built from the answers by rules |

## Data
- Every answer is saved automatically in this browser on this computer, including unfinished interviews.
- **Saved interviews** (top right) → **Download all (CSV)**. There is one row per interview: every answer, follow-up, quality score, English translation, AI themes, and the profile (vision clarity, purpose, confidence, pathway, access, support, segment, Blocked, Voice Quality Index).
- No names are asked. Download and clear the data regularly on shared computers.

## Files
`index.html` (screens) · `app.js` (conversation flow) · `questions.js` (questionnaire text, options and follow-ups; edit the wording here) · `voice.js` (Edge voice and microphone) · `nlp.js` (number and option matching, quality, profile) · `ai.js` and `ai-worker.js` (AI) · `serve.py` and `start.bat` (local server).

The Hindi wording is a draft: have a native speaker review `questions.js` before field use.
