const $ = (id) => document.getElementById(id);
const card = $("card");
const WIDTHS = [400, 800, 1200];
const SIZES = "(max-width: 600px) 92vw, 560px";

let deck = [];
let credits = {};
let pos = 0;
let imgPos = 0;

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const srcset = (id, n) => WIDTHS.map((w) => `img/${id}-${n}-${w}.webp ${w}w`).join(", ");

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
    $("uttal").textContent = `Uttal: ${p.uttal}`;
    $("info").textContent = p.info;
    $("betydelse").textContent = p.betydelse;
  }, card.dataset.ready ? 300 : 0);
  card.dataset.ready = "1";

  const n = credits[p.id].length;
  $("track").replaceChildren(...Array.from({ length: n }, (_, i) => {
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.sizes = SIZES;
    img.srcset = srcset(p.id, i);
    img.src = `img/${p.id}-${i}-800.webp`;
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
  const c = list[imgPos];
  $("credit").innerHTML = `Foto: <a href="${c.page}" target="_blank" rel="noopener">${escapeHtml(c.author || "okänd")}</a>, ${escapeHtml(c.license)}`;
}

const go = (d) => {
  pos = (pos + d + deck.length) % deck.length;
  show();
};
const flip = () => card.classList.toggle("flipped");

card.addEventListener("click", (e) => {
  if (!e.target.closest("a, .img-nav")) flip();
});
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
  if (e.key === "ArrowRight") go(1);
  else if (e.key === "ArrowLeft") go(-1);
  else if (e.key === "ArrowUp") showImage(imgPos - 1);
  else if (e.key === "ArrowDown") showImage(imgPos + 1);
  else if (e.key === " " && e.target === document.body) { e.preventDefault(); flip(); }
});

// Svep vänster/höger på bilden byter bild
let x0 = null;
let y0 = null;
card.addEventListener("touchstart", (e) => {
  x0 = e.touches[0].clientX;
  y0 = e.touches[0].clientY;
}, { passive: true });
card.addEventListener("touchend", (e) => {
  if (x0 === null) return;
  const dx = e.changedTouches[0].clientX - x0;
  const dy = e.changedTouches[0].clientY - y0;
  x0 = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    e.preventDefault(); // hindra att svepet även räknas som klick
    if (!card.classList.contains("flipped")) showImage(imgPos + (dx < 0 ? 1 : -1));
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
