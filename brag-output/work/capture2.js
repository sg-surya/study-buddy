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

// wait until body text length stops changing (stream finished)
async function waitStable(page, ms = 40000) {
  let prev = -1, stable = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const len = await page.evaluate(() => document.body.innerText.length);
    if (len === prev) { stable += 1; } else { stable = 0; }
    prev = len;
    if (stable >= 3) return; // ~1.5s unchanged
    await sleep(500);
  }
}

async function verdict(page) {
  return page.evaluate(() => {
    const m = document.body.innerText.match(/(SUPPORTED|PARTIAL|NOT[_\s]?FOUND)/i);
    return m ? m[1] : null;
  });
}

async function scrollLeftColumn(page) {
  await page.evaluate(() => {
    [...document.querySelectorAll("div")].forEach((e) => {
      const r = e.getBoundingClientRect();
      if (e.scrollHeight > e.clientHeight + 80 && r.width > 500 && r.left < 1140) {
        e.scrollTop = e.scrollHeight;
      }
    });
  });
}

async function ask(page, q) {
  const composer = await page.$("textarea");
  await composer.click();
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.type(q);
  await page.keyboard.press("Enter");
  // wait for a verdict badge to appear, then for stream to settle
  await page.waitForFunction(() => {
    return [...document.querySelectorAll("span,div")].some(
      (e) => e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())
    );
  }, { timeout: 150000 });
  await waitStable(page, 60000);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--window-size=1920,1080", "--hide-scrollbars", "--disable-gpu"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();

  // seed local store so the route resolves (fresh browser profile)
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
  await sleep(6000); // briefing (cached) + settle

  // 1. supported question -> full answer with evidence
  await ask(page, "Explain the key concepts in these notes with examples.");
  await scrollLeftColumn(page);
  await sleep(1500);
  console.log("verdict1:", await verdict(page));
  await shot(page, "04-answer.png");

  // 2. click citation chip if present -> PDF jump
  const hasChip = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => /^c\d+$/.test(b.textContent.trim()))
  );
  console.log("chip:", hasChip);
  if (hasChip) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => /^c\d+$/.test(x.textContent.trim()));
      b.scrollIntoView({ block: "center" });
      b.click();
    });
    await sleep(3500);
    await shot(page, "05-evidence-jump.png");
  }

  // 3. unsupported question -> NOT_FOUND
  await ask(page, "What is the capital of France?");
  await scrollLeftColumn(page);
  await sleep(1500);
  console.log("verdict2:", await verdict(page));
  await shot(page, "06-notfound.png");

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
