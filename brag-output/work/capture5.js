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

(async () => {
  const h = await (await fetch("http://localhost:8000/api/health")).json();
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

  // generative answer with chips
  let got = false;
  for (const q of [
    "Explain the key concepts in these notes with examples.",
    "What is electric charge and how is it classified?",
  ]) {
    await ask(page, q);
    const chip = await page.evaluate(() =>
      [...document.querySelectorAll("button")].some((b) => /^c\d+$/.test(b.textContent.trim()))
    );
    console.log("asked:", q, "chip:", chip);
    if (chip) { got = true; break; }
    await sleep(8000);
  }
  if (!got) { console.error("no chip"); process.exit(3); }

  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^c\d+$/.test(x.textContent.trim()));
    b.scrollIntoView({ block: "center" });
    b.click();
  });
  // viewer reached the evidence page + canvas rendered
  await page.waitForFunction(
    () => document.body.innerText.includes("/ 44") && /[3-9] \/ 44|1\d \/ 44/.test(document.body.innerText),
    { timeout: 15000 }
  ).catch(() => {});
  await sleep(7000); // PDF.js paint time
  await shot(page, "05-evidence-jump.png");

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
