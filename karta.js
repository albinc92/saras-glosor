// Ståndortskarta: en rad per vald växt med ett band över skalan för vald kategori.
// Raderna sorteras efter spannet, så växter som trivs i exakt samma sak hamnar under varandra.

const KARTA = (() => {
  const $ = (id) => document.getElementById(id);

  // Korta kolumnrubriker och en färg per kategori som i kursens ståndortstabell
  const VY = {
    ljus: { namn: "Ljus", kol: ["Sol", "Halvskugga", "Skugga"], farg: "#e2bb3b" },
    fukt: { namn: "Fukt", kol: ["Torrt", "Torrt-friskt", "Friskt", "Fuktigt", "Blött"], farg: "#4f86ea" },
    naring: { namn: "Näring", kol: ["Magert", "Medel", "Näringsrikt"], farg: "#2bb02b" },
    ph: { namn: "pH", kol: ["Lågt", "Medel", "Högt"], farg: "#d23bd2" },
    jord: { namn: "Jord", kol: ["Lerig", "Mellan", "Sandig", "Humus", "Mull/torv"], farg: "#7a6a58" },
  };

  let kat = "fukt";
  let markerad = null; // index för markerad kolumn, eller null
  let ova = false;

  const pool = () => plants.filter((p) => selected.has(p.id));

  function visa() {
    const vy = VY[kat];
    const alt = STANDORT.KATEGORIER.find(([k]) => k === kat)[2];
    $("karta-flikar").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.kat === kat));
    $("karta-ova").setAttribute("aria-pressed", ova);

    // Varje växts index på skalan, t.ex. [2, 3] för friskt–fuktigt
    const rader = pool().map((p) => ({
      p,
      idx: STANDORT.tolka(p.kryss)[kat].map((c) => alt.findIndex(([x]) => x === c)).sort((a, b) => a - b),
    }));
    // Sortera efter var spannet börjar, sedan var det slutar – lika spann hamnar intill varandra
    const nyckel = (r) => r.idx.join(",");
    rader.sort((a, b) => a.idx[0] - b.idx[0] || a.idx.at(-1) - b.idx.at(-1) || a.idx.length - b.idx.length
      || nyckel(a).localeCompare(nyckel(b)) || a.p.sv.localeCompare(b.p.sv, "sv"));

    const tabell = $("karta-tabell");
    tabell.style.setProperty("--kol", vy.kol.length);
    tabell.classList.toggle("ova", ova);
    tabell.classList.toggle("markerad", markerad !== null);

    const huvud = [document.createElement("span"), ...vy.kol.map((namn, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "karta-kol";
      b.textContent = namn;
      b.title = `Markera växter som trivs i ${namn.toLowerCase()}`;
      b.setAttribute("aria-pressed", markerad === i);
      b.addEventListener("click", () => { markerad = markerad === i ? null : i; visa(); });
      return b;
    })];

    let forra = null;
    const kropp = rader.flatMap(({ p, idx }) => {
      const traff = markerad === null || idx.includes(markerad);
      const ny = forra !== null && nyckel({ idx }) !== forra;
      forra = nyckel({ idx });
      const rad = document.createElement("div");
      rad.className = "karta-rad" + (ny ? " ny-grupp" : "") + (traff ? "" : " nedtonad");
      const namn = document.createElement("button");
      namn.type = "button";
      namn.className = "karta-namn";
      namn.textContent = p.sv;
      namn.title = `${p.latin} – visa kortet`;
      namn.addEventListener("click", () => visaKort(p.id));
      // Ett sammanhängande band per obrutet spann; jord är ingen skala och får prickar
      const segment = [];
      for (const i of idx) {
        const sista = segment.at(-1);
        if (kat !== "jord" && sista && sista[1] === i - 1) sista[1] = i; else segment.push([i, i]);
      }
      const band = segment.map(([a, b]) => {
        const s = document.createElement("span");
        s.className = kat === "jord" ? "karta-prick" : "karta-band";
        s.style.gridColumn = `${a + 2} / ${b + 3}`;
        s.style.background = vy.farg;
        return s;
      });
      // I övningsläget döljs banden tills man trycker på raden
      rad.addEventListener("click", (e) => { if (ova && !e.target.closest(".karta-namn")) rad.classList.toggle("visad"); });
      rad.append(namn, ...band);
      return [rad];
    });

    tabell.replaceChildren(Object.assign(document.createElement("div"), { className: "karta-rad karta-huvud" }), ...kropp);
    tabell.firstChild.append(...huvud);
    $("karta-antal").textContent = `${rader.length} växter`;
  }

  function init() {
    $("karta-flikar").replaceChildren(...Object.entries(VY).map(([k, vy]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.kat = k;
      b.textContent = vy.namn;
      b.addEventListener("click", () => { kat = k; markerad = null; visa(); });
      return b;
    }));
    $("karta-ova").addEventListener("click", () => { ova = !ova; visa(); });
  }

  return { init, visa };
})();
