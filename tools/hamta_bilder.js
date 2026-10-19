// Hämtar bilderna i "images" för växter som saknar dem i data/credits.json, från Wikimedia Commons,
// och skalar dem till img/<id>-<nr>-<w>.jpg (via tools/skala.ps1 – kräver PowerShell, inte Python).
// Kör: node tools/hamta_bilder.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const UA = { "User-Agent": "saras-glosor/1.0 (https://github.com/albinc92/saras-glosor)" };
const WIDTHS = [400, 800, 1200];
const vanta = (ms) => new Promise((ok) => setTimeout(ok, ms));
const utanHtml = (s) => (s || "").replace(/<[^>]+>/g, "").trim();

async function get(url, json) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return json ? r.json() : Buffer.from(await r.arrayBuffer());
    // Wikimedia begränsar antal anrop – vänta och försök igen
    if (r.status !== 429) throw new Error(`${r.status} ${url}`);
    await vanta((+r.headers.get("retry-after") || 5 * 2 ** i) * 1000);
  }
  throw new Error("För många anrop: " + url);
}

async function hamta(id, n, namn) {
  const q = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", titles: `File:${namn}`,
    prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1600",
  });
  const info = (await get("https://commons.wikimedia.org/w/api.php?" + q, true)).query.pages[0].imageinfo[0];
  const tmp = path.join(ROOT, "img", `.tmp-${id}-${n}`);
  fs.writeFileSync(tmp, await get(info.thumburl || info.url));
  try {
    execFileSync("pwsh", ["-NoProfile", "-File", path.join(__dirname, "skala.ps1"), tmp, path.join(ROOT, "img", `${id}-${n}`)]);
  } finally {
    fs.unlinkSync(tmp);
  }
  const meta = info.extmetadata;
  return {
    file: namn,
    page: info.descriptionurl,
    author: utanHtml(meta.Artist?.value),
    license: utanHtml(meta.LicenseShortName?.value),
    ext: "jpg",
  };
}

(async () => {
  const plants = JSON.parse(fs.readFileSync(path.join(ROOT, "data/plants.json"), "utf8"));
  const credFil = path.join(ROOT, "data/credits.json");
  const credits = fs.existsSync(credFil) ? JSON.parse(fs.readFileSync(credFil, "utf8")) : {};
  for (const p of plants) {
    const gamla = credits[p.id] || [];
    const nya = [];
    for (const [n, namn] of (p.images || []).entries()) {
      const g = gamla[n];
      const ext = g?.ext || "webp";
      const finns = g && g.file.replace(/_/g, " ") === namn.replace(/_/g, " ")
        && WIDTHS.every((w) => fs.existsSync(path.join(ROOT, `img/${p.id}-${n}-${w}.${ext}`)));
      if (finns) { nya.push(g); continue; }
      nya.push(await hamta(p.id, n, namn));
      console.log("OK", p.latin, n, "<-", namn);
      await vanta(500);
    }
    if (!nya.length) console.error("SAKNAR BILD:", p.latin);
    credits[p.id] = nya;
    // Spara löpande så att ett avbrott inte tappar det som redan hämtats
    fs.writeFileSync(credFil, JSON.stringify(credits, null, 1));
  }
})();
