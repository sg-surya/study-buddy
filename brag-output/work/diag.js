const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--window-size=1920,1400", "--hide-scrollbars", "--disable-gpu"],
    defaultViewport: { width: 1920, height: 1400, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem(
      "sc-notebooks-v2",
      JSON.stringify([{ id: "ca13556f", title: "leph101", createdAt: Date.now(), source: "file",
        file: { name: "leph101.pdf", size: 3949568, pages: 44, chunks: 46, secs: 6 }, messages: [] }])
    );
  });
  await page.goto("http://localhost:5173/notebook/ca13556f", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes("Save to note"), { timeout: 120000 });
  await sleep(3000);

  // ask until an answer with chips exists
  for (const q of ["What is electric charge and how is it classified?",
                   "Explain the key concepts in these notes with examples."]) {
    const before = await page.evaluate(() => [...document.querySelectorAll("span,div")].filter((e) => e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())).length);
    const composer = await page.$("textarea");
    await composer.click();
    await page.keyboard.type(q);
    await page.keyboard.press("Enter");
    await page.waitForFunction((n) => [...document.querySelectorAll("span,div")].filter((e) => e.children.length === 0 && /^(SUPPORTED|PARTIAL|NOT_FOUND)$/.test(e.textContent.trim())).length > n, { timeout: 150000 }, before);
    await sleep(4000);
    const has = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => /^c\d+$/.test(b.textContent.trim())));
    if (has) break;
  }

  const state = () =>
    page.evaluate(() => {
      const out = { canvases: [], stack: [] };
      document.querySelectorAll("canvas").forEach((c) => {
        let px = "n/a";
        try {
          const ctx = c.getContext("2d");
          const d = ctx.getImageData(Math.min(50, c.width / 2), Math.min(50, c.height / 2), 1, 1).data;
          px = `${d[0]},${d[1]},${d[2]},${d[3]}`;
        } catch (e) { px = "err:" + e.message; }
        const r = c.getBoundingClientRect();
        out.canvases.push({ w: c.width, h: c.height, css: `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.top)}`, px });
      });
      // what sits at the viewer's center
      const el = document.elementFromPoint(1400, 400);
      let n = el, chain = [];
      while (n && chain.length < 6) { chain.push(`${n.tagName}.${(n.className || "").toString().slice(0, 40)}`); n = n.parentElement; }
      out.stack = chain;
      return out;
    });

  console.log("BEFORE JUMP:", JSON.stringify(await state(), null, 1));

  // click a chip
  const chip = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^c\d+$/.test(x.textContent.trim()));
    if (b) { b.scrollIntoView({ block: "center" }); b.click(); return b.textContent.trim(); }
    return null;
  });
  console.log("chip:", chip);
  await sleep(6000);
  console.log("AFTER JUMP:", JSON.stringify(await state(), null, 1));

  await page.screenshot({ path: "shots/diag-after-jump.png" });
  await browser.close();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
