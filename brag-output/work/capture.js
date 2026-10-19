const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const APP = "http://localhost:5173";
const OUT = path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });

const PDF = "E:\\ps1\\leph101.pdf";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log("shot", name);
}

async function clickByText(page, selector, text) {
  const ok = await page.evaluate(
    ({ selector, text }) => {
      const els = [...document.querySelectorAll(selector)];
      const el = els.reverse().find((e) => e.textContent.trim().toUpperCase().includes(text.toUpperCase()));
      if (el) { el.click(); return true; }
      return false;
    },
    { selector, text }
  );
  if (!ok) throw new Error(`clickByText failed: ${selector} "${text}"`);
}

async function waitForText(page, text, timeout = 60000) {
  await page.waitForFunction(
    (t) => document.body.innerText.toUpperCase().includes(t.toUpperCase()),
    { timeout },
    text
  );
}

async function waitCiteChip(page, timeout = 90000) {
  await page.waitForFunction(() => {
    return [...document.querySelectorAll("button")].some((b) => /^c\d+$/.test(b.textContent.trim()));
  }, { timeout });
}

async function clickFirstChip(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^c\d+$/.test(x.textContent.trim()));
    if (b) b.click();
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--window-size=1920,1080", "--hide-scrollbars", "--disable-gpu"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();

  // 1. Hero
  await page.goto(APP, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(2500);
  await shot(page, "01-hero.png");

  // 2. Create Notebook popup
  await clickByText(page, "button, a", "CREATE NOTEBOOK");
  await sleep(1200);
  await shot(page, "02-popup.png");

  // 3. Upload real PDF through the popup's file input
  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) throw new Error("no file input in popup");
  await fileInput.uploadFile(PDF);
  await sleep(2500);

  // 4. Create -> notebook route -> Ready badge + briefing
  await clickByText(page, ".fixed.z-50 button", "Create");
  await page.waitForFunction(() => location.pathname.includes("/notebook/"), { timeout: 30000 });
  console.log("notebook route:", page.url());
  await waitForText(page, "Ready", 60000);          // processing done
  await waitForText(page, "Save to note", 120000);  // briefing card generated (LLM)
  await sleep(4000);                                // suggestion cards settle
  await shot(page, "03-notebook-briefing.png");

  // 5. Ask supported question -> answer card with evidence chips
  const composer = await page.$('textarea, [contenteditable="true"]');
  if (!composer) throw new Error("no composer");
  await composer.click();
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.type("Explain the key concepts in these notes with examples.");
  await page.keyboard.press("Enter");
  // answer rendered = a verdict badge OR an evidence chip appears
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].some((b) => /^c\d+$/.test(b.textContent.trim())) ||
      /SUPPORTED|PARTIAL|NOT[_\s]?FOUND/i.test(document.body.innerText),
    { timeout: 120000 }
  );
  await sleep(3000);
  await shot(page, "04-answer.png");

  // 6. Click first citation chip -> PDF viewer page jump
  const hasChip = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => /^c\d+$/.test(b.textContent.trim()))
  );
  if (hasChip) {
    await clickFirstChip(page);
    await sleep(3500);
  } else {
    console.log("no chip in answer (verdict-only), skipping jump shot");
  }
  await shot(page, "05-evidence-jump.png");

  // 7. Ask unsupported -> NOT_FOUND verdict
  await composer.click();
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.type("What is the capital of France?");
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => /NOT[_\s]?FOUND/i.test(document.body.innerText),
    { timeout: 120000 }
  );
  await sleep(2500);
  await shot(page, "06-notfound.png");

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
