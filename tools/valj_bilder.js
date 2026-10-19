// Fyller på "images" i data/plants.json upp till 5 bilder per växt från Wikimedia Commons:
// Wikipedias huvudbild (oftast hela växten) + bilder på olika motiv (blad, bark, blomma, frukt …).
// Befintliga bilder behålls. Kör: node tools/valj_bilder.js – byt sedan gärna ut bilder för hand.
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "plants.json");
const UA = { "User-Agent": "saras-glosor/1.0 (https://github.com/albinc92/saras-glosor)" };
// Undvik herbarieark, teckningar, kartor m.m. som inte visar växten som den ser ut
const NEJ = /herbar|illustration|drawing|map|distribution|köhler|thomé|plate|sketch|diagram|\.svg|\.tif|\.gif|stamp|logo|wood ?sample|veneer|seed ?bank|epidermis|stomata|print|section|root|wortel|damage|gall|larva|caterpillar| on |infest|fungus|disease|bonsai|cross|wellcome|mehltau|mildew|wond|beschadig|bud|seedling|sapling|schwebfliege|melaphis|insect|fly|bee|bug|beetle|aphid|apis|bombus|knop|mhnt\.bot|microscope|twig|pollinat/i;

async function api(host, params) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: UA });
    if (r.status !== 429) return r.json();
    await new Promise((ok) => setTimeout(ok, 5000 * 2 ** i));
  }
  throw new Error("För många anrop: " + url);
}

async function huvudbild(titel) {
  for (const host of ["en.wikipedia.org", "sv.wikipedia.org"]) {
    const d = await api(host, { action: "query", titles: titel, prop: "pageimages", piprop: "name", redirects: 1 });
    const namn = d.query.pages[0].pageimage;
    if (namn && !NEJ.test(namn) && /\.jpe?g$/i.test(namn)) return namn.replace(/_/g, " ");
  }
  return null;
}

async function sok(fraga, upptagna, kravOrd) {
  const d = await api("commons.wikimedia.org", {
    action: "query", generator: "search", gsrsearch: fraga, gsrnamespace: 6, gsrlimit: 20,
    prop: "imageinfo", iiprop: "size|mime",
  });
  const sidor = (d.query?.pages || []).sort((a, b) => a.index - b.index);
  for (const s of sidor) {
    const ii = s.imageinfo?.[0];
    const namn = s.title.replace(/^File:/, "");
    if (!ii || ii.mime !== "image/jpeg" || NEJ.test(namn) || upptagna.has(namn)) continue;
    if (Math.min(ii.width, ii.height) < 900) continue;
    // Artnamnet (släkte + art) måste finnas i filnamnet så det inte blir en annan art
    if (!kravOrd.every((o) => namn.toLowerCase().includes(o))) continue;
    return namn;
  }
  return null;
}

const ANTAL = 5;
// Vad bilderna ska visa, i tur och ordning, så de ger olika saker att känna igen växten på
const MOTIV = {
  "träd": ["leaf|leaves", "bark", "flower|flowers|blossom", "fruit|fruits|seeds", "tree"],
  "perenn": ["flower|flowers", "leaves|leaf", "seed head|fruit", "garden|habit", ""],
};

(async () => {
  const plants = JSON.parse(fs.readFileSync(FILE, "utf8"));
  for (const p of plants) {
    const bilder = [...(p.images || [])];
    if (bilder.length >= ANTAL) continue;
    // Artnamnet från wiki-fältet (t.ex. "Iris × germanica" -> "Iris germanica")
    const art = p.wiki.replace(/ ×/g, "").replace(/'/g, "");
    const krav = art.toLowerCase().split(" ").slice(0, 2);
    const upptagna = new Set(bilder.map((b) => b.replace(/_/g, " ")));
    const lagg = (n) => { if (n) { bilder.push(n); upptagna.add(n); } };
    // Befintliga bilder täcker redan huvudbilden + de första motiven – fortsätt därifrån
    const motivLista = p.kategori === "träd" ? MOTIV[p.kategori].slice(Math.max(0, bilder.length - 1)) : MOTIV[p.kategori];
    if (!bilder.length) lagg(await huvudbild(p.wiki));
    for (const motiv of motivLista) {
      if (bilder.length >= ANTAL) break;
      for (const ord of motiv.split("|")) {
        const n = await sok(`${art} ${ord}`.trim(), upptagna, krav);
        if (n) { lagg(n); break; }
      }
    }
    // Fyll på med valfria bilder av arten om något motiv saknades
    while (bilder.length < ANTAL) {
      const n = await sok(art, upptagna, krav);
      if (!n) break;
      lagg(n);
    }
    console.log(p.sv.padEnd(22), bilder.slice((p.images || []).length).join(" | "));
    p.images = bilder;
    fs.writeFileSync(FILE, "[\n" + plants.map((x) => "  " + JSON.stringify(x)).join(",\n") + "\n]\n");
  }
})();
