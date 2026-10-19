const $ = (id) => document.getElementById(id);
const card = $("card");
const WIDTHS = [400, 800, 1200];
const SIZES = "(max-width: 600px) 92vw, 560px";

let plants = [];
let selected = new Set();
let deck = [];
let credits = {};
let pos = 0;
let imgPos = 0;
let order = []; // bildernas ordning för aktuell växt – slumpas varje gång växten visas

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Perennernas bilder är WebP, trädens JPG (credits anger ext)
const ext = (id, n) => credits[id]?.[n]?.ext || "webp";
const srcset = (id, n) => WIDTHS.map((w) => `img/${id}-${n}-${w}.${ext(id, n)} ${w}w`).join(", ");

function preload(p) {
  if (!p) return;
  const img = new Image();
  img.sizes = SIZES;
  img.srcset = srcset(p.id, 0);
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function show() {
  const p = deck[pos];
  card.classList.remove("flipped");
  // Vänta tills kortet vänt tillbaka innan baksidan byts, så svaret inte syns
  setTimeout(() => {
    $("sv").textContent = p.sv;
    $("latin").textContent = p.latin;
    $("uttal").textContent = UTTAL(p.betonad || p.latin);
    $("standort").textContent = STANDORT(p.kryss);
    $("betydelse").textContent = p.betydelse;
  }, card.dataset.ready ? 300 : 0);
  card.dataset.ready = "1";

  const n = credits[p.id].length;
  // Ny slumpad bildordning varje gång, så första bilden inte avslöjar växten
  order = shuffle([...Array(n).keys()]);
  $("track").replaceChildren(...order.map((i) => {
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.sizes = SIZES;
    img.srcset = srcset(p.id, i);
    img.src = `img/${p.id}-${i}-800.${ext(p.id, i)}`;
    return img;
  }));
  $("dots").replaceChildren(...Array.from({ length: n }, () => document.createElement("span")));
  card.classList.toggle("multi", n > 1);
  showImage(0);

  $("counter").textContent = `${pos + 1} / ${deck.length}`;
  preload(deck[pos + 1]);
}

function showImage(i) {
  const list = credits[deck[pos].id];
  imgPos = (i + list.length) % list.length;
  $("track").style.transform = `translateX(${-100 * imgPos}%)`;
  [...$("dots").children].forEach((d, j) => d.classList.toggle("on", j === imgPos));
  const c = list[order[imgPos]];
  $("credit").innerHTML = `Foto: <a href="${c.page}" target="_blank" rel="noopener">${escapeHtml(c.author || "okänd")}</a>, ${escapeHtml(c.license)}`;
}

const go = (d) => {
  pos = (pos + d + deck.length) % deck.length;
  show();
};
const flip = () => card.classList.toggle("flipped");

card.addEventListener("keydown", (e) => {
  if (e.target === card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); flip(); }
});
$("img-prev").addEventListener("click", () => showImage(imgPos - 1));
$("img-next").addEventListener("click", () => showImage(imgPos + 1));
$("next").addEventListener("click", () => go(1));
$("prev").addEventListener("click", () => go(-1));
$("shuffle").addEventListener("click", () => {
  shuffle(deck);
  pos = 0;
  show();
});

document.addEventListener("keydown", (e) => {
  if (picker.open) return;
  if (e.key === "ArrowRight") go(1);
  else if (e.key === "ArrowLeft") go(-1);
  else if (e.key === "ArrowUp") showImage(imgPos - 1);
  else if (e.key === "ArrowDown") showImage(imgPos + 1);
  else if (e.key === " " && e.target === document.body) { e.preventDefault(); flip(); }
});

// Svep (finger eller mus) åt vänster/höger på bilden byter bild, ett tryck vänder kortet
let start = null;
card.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || e.target.closest("a, .img-nav")) return;
  start = { x: e.clientX, y: e.clientY };
});
card.addEventListener("pointerup", (e) => {
  if (!start) return;
  const dx = e.clientX - start.x;
  const dy = e.clientY - start.y;
  start = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    if (!card.classList.contains("flipped")) showImage(imgPos + (dx < 0 ? 1 : -1));
  } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
    flip();
  }
});
card.addEventListener("pointercancel", () => { start = null; });

// Urval av växter – sparas i webbläsaren så det finns kvar till nästa gång
const STORE = "valda-vaxter";

function loadSelection() {
  try {
    const sparat = JSON.parse(localStorage.getItem(STORE));
    // Gammalt format: bara en lista med valda (då fanns bara perenner)
    const valda = Array.isArray(sparat) ? sparat : sparat?.valda;
    const kanda = Array.isArray(sparat) ? plants.filter((p) => p.kategori === "perenn").map((p) => p.id) : sparat?.kanda;
    if (Array.isArray(valda) && Array.isArray(kanda)) {
      // Växter som tillkommit sedan sist är valda från start
      const valid = plants.filter((p) => valda.includes(p.id) || !kanda.includes(p.id)).map((p) => p.id);
      if (valid.length) return new Set(valid);
    }
  } catch {}
  return new Set(plants.map((p) => p.id));
}

function saveSelection() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ valda: [...selected], kanda: plants.map((p) => p.id) }));
  } catch {}
}

function buildDeck() {
  deck = shuffle(plants.filter((p) => selected.has(p.id)));
  pos = 0;
  $("pick").textContent = selected.size === plants.length ? "Välj växter" : `Välj växter (${selected.size})`;
  show();
}

const picker = $("picker");
const KATEGORIER = [["perenn", "Perenner"], ["träd", "Träd"]];
const boxes = (root = $("pick-list")) => [...root.querySelectorAll("input[value]")];

function updatePickCount() {
  const n = boxes().filter((b) => b.checked).length;
  $("pick-count").textContent = `${n} av ${plants.length} valda`;
  $("pick-done").disabled = n === 0;
  // Antal valda per kategori i rubriken
  for (const grupp of $("pick-list").children) {
    const b = boxes(grupp);
    grupp.querySelector(".pick-n").textContent = `${b.filter((x) => x.checked).length}/${b.length}`;
  }
}

$("pick").addEventListener("click", () => {
  boxes().forEach((b) => { b.checked = selected.has(b.value); });
  updatePickCount();
  picker.showModal();
});
$("pick-list").addEventListener("change", updatePickCount);
// Alla/Inga inom en kategori
$("pick-list").addEventListener("click", (e) => {
  const knapp = e.target.closest("[data-alla]");
  if (!knapp) return;
  e.preventDefault(); // knappen sitter i <summary> – fäll inte ihop/ut kategorin
  boxes(knapp.closest("details")).forEach((b) => { b.checked = knapp.dataset.alla === "1"; });
  updatePickCount();
});
$("pick-all").addEventListener("click", () => { boxes().forEach((b) => { b.checked = true; }); updatePickCount(); });
$("pick-none").addEventListener("click", () => { boxes().forEach((b) => { b.checked = false; }); updatePickCount(); });
$("pick-done").addEventListener("click", () => {
  selected = new Set(boxes().filter((b) => b.checked).map((b) => b.value));
  saveSelection();
  buildDeck();
});

Promise.all([
  fetch("data/plants.json").then((r) => r.json()),
  fetch("data/credits.json").then((r) => r.json()),
]).then(([p, c]) => {
  plants = p;
  credits = c;
  $("pick-list").replaceChildren(...KATEGORIER.map(([kat, namn]) => {
    // Kategorierna är ihopfällda från start – klicka på rubriken för att fälla ut
    const grupp = document.createElement("details");
    grupp.className = "pick-group";
    grupp.innerHTML = `<summary class="pick-head"><h3>${namn} <span class="pick-n"></span></h3>` +
      `<button type="button" data-alla="1">Alla</button><button type="button" data-alla="0">Inga</button></summary>` +
      `<ul class="pick-list"></ul>`;
    grupp.querySelector("ul").replaceChildren(...plants.filter((p) => p.kategori === kat)
      .sort((a, b) => a.sv.localeCompare(b.sv, "sv")).map((p) => {
        const li = document.createElement("li");
        li.innerHTML = `<label><input type="checkbox" value="${p.id}"><span><span class="s"></span><span class="l"></span></span></label>`;
        li.querySelector(".s").textContent = p.sv;
        li.querySelector(".l").textContent = p.latin;
        return li;
      }));
    return grupp;
  }));
  selected = loadSelection();
  buildDeck();
});
