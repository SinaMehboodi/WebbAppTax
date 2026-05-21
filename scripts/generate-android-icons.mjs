// Generates SamTaxco-branded Android launcher icons (legacy mipmaps + the
// adaptive icon foreground for API 26+) by rendering a small HTML page in
// headless Chrome at each required density.
//
// Source design: a soft white "S" on the emerald brand gradient, rounded
// square. Designed at 1024x1024 then scaled down for each mipmap density.
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ANDROID_RES = path.resolve("android/app/src/main/res");

// (folder, size) pairs for the legacy mipmaps (filled square icon)
const MIPMAPS = [
  ["mipmap-mdpi",    48],
  ["mipmap-hdpi",    72],
  ["mipmap-xhdpi",   96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi",192],
];

// HTML template — we render at 1024 then screenshot. The padded design works
// for both legacy and adaptive (the safe zone in adaptive icons is 66 % of
// the canvas, and our "S" sits inside that).
function html({ size, rounded, padded }) {
  // padded => add a bit of breathing room so the bg covers the full square,
  // but the letter stays in the safe zone.
  const radius = rounded ? size * 0.22 : 0; // 22 % corner radius — Android adaptive masks
  const letterSize = padded ? size * 0.45 : size * 0.62;
  return `<!doctype html>
<html><head><style>
  html, body { margin: 0; padding: 0; background: transparent; }
  .icon {
    width: ${size}px; height: ${size}px;
    border-radius: ${radius}px;
    background:
      radial-gradient(circle at 22% 22%, rgba(255,255,255,0.18), transparent 55%),
      linear-gradient(135deg, #10b981 0%, #059669 55%, #0d9488 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-weight: 700;
    color: #ffffff;
    font-size: ${letterSize}px;
    line-height: 1;
    box-shadow: ${rounded ? `inset 0 -${size * 0.04}px 0 rgba(0,0,0,0.08)` : "none"};
    letter-spacing: -${size * 0.02}px;
  }
</style></head>
<body>
  <div class="icon">S</div>
</body></html>`;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  // ── Legacy square icons (mipmap-{density}/ic_launcher.png + _round.png) ──
  for (const [folder, size] of MIPMAPS) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    for (const round of [false, true]) {
      await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
      await page.setContent(html({ size, rounded: true, padded: false }), { waitUntil: "domcontentloaded" });
      // Brief settle for fonts
      await new Promise((r) => setTimeout(r, 80));
      const file = path.join(dir, round ? "ic_launcher_round.png" : "ic_launcher.png");
      await page.screenshot({
        path: file,
        omitBackground: true,
        type: "png",
        clip: { x: 0, y: 0, width: size, height: size },
      });
      console.log(`  ${folder}/${path.basename(file)} (${size}x${size})`);
    }
  }

  // ── Adaptive icon foreground (API 26+) — 432x432 in xxxhdpi ─────────────
  // Background: solid emerald color drawable (XML, generated below).
  for (const [folder, size] of MIPMAPS) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    const fgSize = Math.round(size * 1.5); // adaptive foreground is larger
    await page.setViewport({ width: fgSize, height: fgSize, deviceScaleFactor: 1 });
    await page.setContent(html({ size: fgSize, rounded: false, padded: true }), { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 80));
    const file = path.join(dir, "ic_launcher_foreground.png");
    await page.screenshot({
      path: file,
      omitBackground: true,
      type: "png",
      clip: { x: 0, y: 0, width: fgSize, height: fgSize },
    });
    console.log(`  ${folder}/ic_launcher_foreground.png (${fgSize}x${fgSize})`);
  }

  await browser.close();

  // ── Adaptive icon XML + background color ──────────────────────────────
  const adaptiveDir = path.join(ANDROID_RES, "mipmap-anydpi-v26");
  await fs.mkdir(adaptiveDir, { recursive: true });
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  await fs.writeFile(path.join(adaptiveDir, "ic_launcher.xml"), adaptiveXml);
  await fs.writeFile(path.join(adaptiveDir, "ic_launcher_round.xml"), adaptiveXml);

  // Colors.xml with the brand background colour
  const valuesDir = path.join(ANDROID_RES, "values");
  await fs.mkdir(valuesDir, { recursive: true });
  const colorsFile = path.join(valuesDir, "ic_launcher_background.xml");
  await fs.writeFile(
    colorsFile,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#10b981</color>
</resources>
`
  );

  console.log("\nIcons regenerated.");
}

main().catch((e) => { console.error(e); process.exit(1); });
