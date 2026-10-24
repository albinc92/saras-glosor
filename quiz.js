// Quiz: "Nämn 2 växter som trivs i …" utifrån ståndortstabellen.
// Frågorna gäller bara de växter som är valda i "Välj växter" (plants/selected från app.js).

const QUIZ = (() => {
  const $ = (id) => document.getElementById(id);
  const slump = (a) => a[Math.floor(Math.random() * a.length)];

  // Hur ett krav skrivs i frågan, per kategori. Ett krav är en eller två intilliggande koder.
  const FRAS = {
    ljus: { S: "sol", H: "halvskugga", Sk: "skugga" },
    fukt: { T: "torr", TF: "torr-frisk", F: "frisk", Fu: "fuktig", B: "blöt" },
    naring: { Ma: "mager", Me: "medelnäringsrik", N: "näringsrik" },
    ph: { L: "lågt", M: "medel", H: "högt/kalkhaltigt" },
    jord: { ler: "lerig mineraljord", mel: "mellan mineraljord", sand: "sandig mineraljord", hum: "humusrik jord", mull: "mull/torvbaserad jord" },
  };
  const ORDNING = ["ljus", "fukt", "naring", "jord", "ph"]; // ordningen i frågans mening

  function fras(k, koder) {
    const n = koder.map((c) => FRAS[k][c]);
    const spann = n.length > 1 ? `${n[0]} till ${n[1]}` : n[0];
    if (k === "fukt") return `${spann} jord`;
    if (k === "naring") return n.length > 1 ? `${spann.replace("medelnäringsrik till", "medel- till")} jord` : `${spann} jord`;
    if (k === "ph") return spann === "medel" ? "medel-pH" : `${spann} pH`;
    return spann;
  }

  const och = (a) => a.length > 1 ? a.slice(0, -1).join(", ") + " och " + a.at(-1) : a[0];
  const pool = () => plants.filter((p) => selected.has(p.id));
  const passar = (p, krav) => {
    const t = STANDORT.tolka(p.kryss);
    return krav.every(([k, koder]) => koder.every((c) => t[k].includes(c)));
  };

  // Slumpa ett krav (en kod, eller två intilliggande på en skala – inte för jord)
  function slumpKrav(k) {
    const alt = STANDORT.KATEGORIER.find(([x]) => x === k)[2].map(([c]) => c);
    const i = Math.floor(Math.random() * alt.length);
    if (k !== "jord" && i < alt.length - 1 && Math.random() < 0.3) return [k, [alt[i], alt[i + 1]]];
    return [k, [alt[i]]];
  }

  function nyFraga() {
    const vaxter = pool();
    if (vaxter.length < 4) return null;
    // Frågan ska skilja ut växterna: minst så många som efterfrågas passar, men inte nästan alla
    for (let forsok = 0; forsok < 500; forsok++) {
      const antalKrav = slump([1, 2, 2, 2, 3]);
      const kat = [...ORDNING].sort(() => Math.random() - 0.5).slice(0, antalKrav);
      const krav = kat.map(slumpKrav).sort((a, b) => ORDNING.indexOf(a[0]) - ORDNING.indexOf(b[0]));
      const ratt = vaxter.filter((p) => passar(p, krav));
      const antal = ratt.length >= 6 && Math.random() < 0.4 ? 3 : 2;
      if (ratt.length < antal || ratt.length > vaxter.length * 0.5) continue;
      return { krav, ratt, antal, text: `Nämn ${antal} växter som trivs i ${och(krav.map(([k, c]) => fras(k, c)))}.` };
    }
    return null;
  }

  // Svar matchas mot svenskt eller latinskt namn, utan hänsyn till skiftläge, accenter och ×
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[×'’]/g, "").replace(/\s+/g, " ").trim();
  const hitta = (svar) => plants.find((p) => norm(p.sv) === norm(svar) || norm(p.latin) === norm(svar) || norm(p.wiki) === norm(svar));

  let fraga = null;

  function visa() {
    fraga = nyFraga();
    $("quiz-svar").replaceChildren();
    $("quiz-ratta").hidden = false;
    if (!fraga) {
      $("quiz-q").textContent = "Välj minst 4 växter i ”Välj växter” för att kunna quizza.";
      $("quiz-inputs").replaceChildren();
      $("quiz-ratta").hidden = true;
      return;
    }
    $("quiz-q").textContent = fraga.text;
    $("quiz-inputs").replaceChildren(...Array.from({ length: fraga.antal }, (_, i) => {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.autocomplete = "off";
      // Telefonens autokorrigering "rättar" annars latinska namn till andra ord
      inp.setAttribute("autocorrect", "off");
      inp.setAttribute("autocapitalize", "off");
      inp.spellcheck = false;
      inp.enterKeyHint = "send";
      inp.placeholder = `Växt ${i + 1}`;
      return inp;
    }));
    $("quiz-inputs").firstChild.focus();
  }

  function ratta() {
    if (!fraga) return;
    const sedda = new Set();
    const rader = [...$("quiz-inputs").children].map((inp) => {
      const li = document.createElement("li");
      const p = inp.value.trim() && hitta(inp.value);
      if (!inp.value.trim()) {
        li.className = "fel";
        li.textContent = "(inget svar)";
      } else if (!p) {
        li.className = "fel";
        li.textContent = `”${inp.value.trim()}” – känner inte igen namnet`;
      } else if (sedda.has(p.id)) {
        li.className = "fel";
        li.textContent = `${p.sv} – redan svarad`;
      } else if (fraga.ratt.includes(p)) {
        li.className = "ratt";
        li.dataset.id = p.id;
        li.textContent = `${p.sv} (${p.latin}) – rätt!`;
      } else {
        // Visa vad växten faktiskt trivs i för de kategorier frågan gällde
        const t = STANDORT.rader(p.kryss);
        const relevant = fraga.krav.map(([k]) => STANDORT.KATEGORIER.findIndex(([x]) => x === k))
          .map((i) => `${t[i][0]}: ${t[i][1].toLowerCase()}`);
        li.className = "fel";
        li.textContent = `${p.sv} – fel. ${relevant.join(", ")}.`;
      }
      if (p) sedda.add(p.id);
      return li;
    });
    const antalRatt = rader.filter((li) => li.className === "ratt").length;
    // Vid fel: visa en växt som hade varit rätt (som inte redan är besvarad), med latinskt namn
    const besvarade = new Set(rader.filter((li) => li.className === "ratt").map((li) => li.dataset.id));
    const kvar = fraga.ratt.filter((p) => !besvarade.has(p.id));
    rader.forEach((li) => {
      if (li.className !== "fel") return;
      const p = kvar.shift();
      if (!p) return;
      const r = document.createElement("span");
      r.className = "quiz-korrekt";
      r.textContent = `Rätt svar t.ex.: ${p.sv} (${p.latin})`;
      li.append(document.createElement("br"), r);
    });
    const rubrik = document.createElement("p");
    rubrik.className = "quiz-resultat";
    rubrik.textContent = `${antalRatt} av ${fraga.antal} rätt`;
    const lista = document.createElement("ul");
    lista.className = "quiz-rader";
    lista.replaceChildren(...rader);
    const alla = document.createElement("p");
    alla.className = "quiz-alla";
    alla.textContent = "Alla som passar: " + [...fraga.ratt].sort((a, b) => a.sv.localeCompare(b.sv, "sv"))
      .map((p) => `${p.sv} (${p.latin})`).join(", ") + ".";
    $("quiz-svar").replaceChildren(rubrik, lista, alla);
    $("quiz-ratta").hidden = true;
    $("quiz-ny").focus();
  }

  function init() {
    $("quiz-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if ($("quiz-ratta").hidden) visa(); else ratta();
    });
    $("quiz-ny").addEventListener("click", visa);
  }

  return { init, visa };
})();
