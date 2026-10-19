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

// ask and wait: a NEW answer badge appears, then the page text stops changing
async function ask(page, q) {
  const before = await page.evaluate(
    () =>
      [...document.querySelectorAll("span,div")].filter((e) =>
        e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())
      ).length
  );
  const composer = await page.$("textarea");
  await composer.click();
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.type(q);
  await page.keyboard.press("Enter");
  // 1. new verdict badge = answer card rendered
  await page.waitForFunction(
    (n) =>
      [...document.querySelectorAll("span,div")].filter((e) =>
        e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())
      ).length > n,
    { timeout: 150000 },
    before
  );
  // 2. stream settled: innerText unchanged for ~2.5s
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

// verdict of the LAST answer card
async function lastVerdict(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll("span,div")].filter((e) =>
      e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())
    );
    return all.length ? all[all.length - 1].textContent.trim() : null;
  });
}

async function scrollChatBottom(page) {
  await page.evaluate(() => {
    [...document.querySelectorAll("div")].forEach((e) => {
      const r = e.getBoundingClientRect();
      if (e.scrollHeight > e.clientHeight + 80 && r.width > 500 && r.left < 1140) {
        e.scrollTop = e.scrollHeight;
      }
    });
  });
}

async function hasChip(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => /^c\d+$/.test(b.textContent.trim()))
  );
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--window-size=1920,1080", "--hide-scrollbars", "--disable-gpu"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
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
  await sleep(6000);

  // 1. supported answer — retry questions until verdict SUPPORTED
  const questions = [
    "Explain the key concepts in these notes with examples.",
    "What is electric charge and how is it classified?",
    "State the properties of electric charge with examples.",
  ];
  let v = null;
  for (const q of questions) {
    await ask(page, q);
    v = await lastVerdict(page);
    console.log("Q:", q, "-> verdict:", v);
    if (v === "SUPPORTED" || v === "PARTIAL") break;
  }
  await scrollChatBottom(page);
  await sleep(1200);
  await shot(page, "04-answer.png");

  // 2. chip jump if present
  const chip = await hasChip(page);
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

  // 3. unsupported -> NOT_FOUND
  await ask(page, "What is the capital of France?");
  await scrollChatBottom(page);
  await sleep(1200);
  console.log("verdict France:", await lastVerdict(page));
  await shot(page, "06-notfound.png");

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
