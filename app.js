const $ = (id) => document.getElementById(id);
const card = $("card");
const WIDTHS = [400, 800, 1200];

let deck = [];
let credits = {};
let pos = 0;

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const srcset = (id) => WIDTHS.map((w) => `img/${id}-${w}.webp ${w}w`).join(", ");

function preload(p) {
  if (!p) return;
  const img = new Image();
  img.sizes = "(max-width: 600px) 92vw, 560px";
  img.srcset = srcset(p.id);
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
    $("uttal").textContent = `Uttal: ${p.uttal}`;
    $("info").textContent = p.info;
    $("betydelse").textContent = p.betydelse;
  }, card.dataset.ready ? 300 : 0);
  card.dataset.ready = "1";

  const c = credits[p.id];
  $("credit").innerHTML = c
    ? `Foto: <a href="${c.page}" target="_blank" rel="noopener">${escapeHtml(c.author || "okänd")}</a>, ${escapeHtml(c.license)}`
    : "";

  const img = $("img");
  img.sizes = "(max-width: 600px) 92vw, 560px";
  img.srcset = srcset(p.id);
  img.src = `img/${p.id}-800.webp`;
  $("counter").textContent = `${pos + 1} / ${deck.length}`;
  preload(deck[pos + 1]);
}

const go = (d) => {
  pos = (pos + d + deck.length) % deck.length;
  show();
};
const flip = () => card.classList.toggle("flipped");

card.addEventListener("click", (e) => {
  if (!e.target.closest("a")) flip();
});
card.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
});
$("next").addEventListener("click", () => go(1));
$("prev").addEventListener("click", () => go(-1));
$("shuffle").addEventListener("click", () => {
  shuffle(deck);
  pos = 0;
  show();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") go(1);
  else if (e.key === "ArrowLeft") go(-1);
  else if (e.key === " " && e.target !== card) { e.preventDefault(); flip(); }
});

// Svep vänster/höger på mobil
let x0 = null;
card.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
card.addEventListener("touchend", (e) => {
  if (x0 === null) return;
  const dx = e.changedTouches[0].clientX - x0;
  x0 = null;
  if (Math.abs(dx) > 50) {
    e.preventDefault(); // hindra att svepet även räknas som klick
    go(dx < 0 ? 1 : -1);
  }
});

Promise.all([
  fetch("data/plants.json").then((r) => r.json()),
  fetch("data/credits.json").then((r) => r.json()),
]).then(([plants, c]) => {
  credits = c;
  deck = shuffle(plants);
  show();
});
