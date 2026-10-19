const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = path.join(__dirname, "shots");
const NB = "http://localhost:5173/notebook/ca13556f";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log("shot", name);
}

async function badgeCount(page) {
  return page.evaluate(
    () =>
      [...document.querySelectorAll("span,div")].filter((e) =>
        e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())
      ).length
  );
}

async function ask(page, q) {
  const before = await badgeCount(page);
  const composer = await page.$("textarea");
  await composer.click();
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.type(q);
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    (n) =>
      [...document.querySelectorAll("span,div")].filter((e) =>
        e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())
      ).length > n,
    { timeout: 150000 },
    before
  );
  // stream settled
  let prev = -1, stable = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const len = await page.evaluate(() => document.body.innerText.length);
    stable = len === prev ? stable + 1 : 0;
    prev = len;
    if (stable >= 5) break;
    await sleep(500);
  }
  await sleep(1500);
}

// last answer's text length (generative > 700 chars; extractive fallback caps ~600)
async function lastAnswerLen(page) {
  return page.evaluate(() => {
    const badges = [...document.querySelectorAll("span,div")].filter((e) =>
      e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())
    );
    if (!badges.length) return 0;
    const card = badges[badges.length - 1].closest("div").parentElement;
    return (card ? card.innerText : "").length;
  });
}

async function scrollLastAnswer(page) {
  await page.evaluate(() => {
    const badges = [...document.querySelectorAll("span,div")].filter((e) =>
      e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())
    );
    if (badges.length) badges[badges.length - 1].scrollIntoView({ block: "center" });
  });
  await sleep(800);
}

async function lastVerdict(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll("span,div")].filter((e) =>
      e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())
    );
    return all.length ? all[all.length - 1].textContent.trim() : null;
  });
}

(async () => {
  // preflight: chat model must be loaded for generative answers
  const h = await (await fetch("http://localhost:8000/api/health")).json();
  console.log("health:", h.chat_model);
  if (!h.chat_model) { console.error("ABORT: no chat model"); process.exit(2); }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--window-size=1920,1400", "--hide-scrollbars", "--disable-gpu"],
    defaultViewport: { width: 1920, height: 1400, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();

  await page.evaluateOnNewDocument((nb) => {
    localStorage.setItem(
      "sc-notebooks-v2",
      JSON.stringify([
        {
          id: nb, title: "leph101", createdAt: Date.now(), source: "file",
          file: { name: "leph101.pdf", size: 3949568, pages: 44, chunks: 46, secs: 6 },
          messages: [],
        },
      ])
    );
  }, "ca13556f");

  await page.goto(NB, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes("Save to note"), { timeout: 120000 });
  await sleep(3000);
  await shot(page, "03-notebook-briefing.png");

  // supported answer — retry until generative (long) answer
  const questions = [
    "Explain the key concepts in these notes with examples.",
    "What is electric charge and how is it classified?",
    "State the properties of electric charge with examples.",
  ];
  let len = 0;
  for (const q of questions) {
    await ask(page, q);
    len = await lastAnswerLen(page);
    const v = await lastVerdict(page);
    console.log("Q:", q, "-> verdict:", v, "answerTextLen:", len);
    if ((v === "SUPPORTED" || v === "PARTIAL") && len > 700) break;
    await sleep(8000); // let LM Studio recover before retry
  }
  await scrollLastAnswer(page);
  await shot(page, "04-answer.png");

  // chip jump
  const chip = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => /^c\d+$/.test(b.textContent.trim()))
  );
  console.log("chip:", chip);
  if (chip) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /^c\d+$/.test(x.textContent.trim()));
      b.scrollIntoView({ block: "center" });
      b.click();
    });
    await sleep(3500);
    await shot(page, "05-evidence-jump.png");
  }

  // unsupported -> NOT_FOUND
  await ask(page, "What is the capital of France?");
  console.log("France verdict:", await lastVerdict(page));
  await scrollLastAnswer(page);
  await shot(page, "06-notfound.png");

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
