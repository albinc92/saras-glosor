// Stavning: "Vad heter X på latin?" eller "Vad heter Y på svenska?" – man skriver svaret och får det rättat.
// Använder de växter som är valda i "Välj växter" (plants/selected från app.js).

const STAVNING = (() => {
  const $ = (id) => document.getElementById(id);

  let lista = [];
  let i = 0;
  let fraga = null; // { p, tillLatin }

  // Jämför utan hänsyn till skiftläge, accenter, ×, citattecken och extra mellanslag
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[×'’‘"]/g, "").replace(/\s+/g, " ").trim();

  // Antal bokstäver som skiljer (Levenshtein) – för "Nästan!"
  function avstand(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, x) => [x]);
    for (let y = 1; y <= b.length; y++) d[0][y] = y;
    for (let x = 1; x <= a.length; x++) {
      for (let y = 1; y <= b.length; y++) {
        d[x][y] = Math.min(d[x - 1][y] + 1, d[x][y - 1] + 1, d[x - 1][y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  }

  function nyFraga() {
    const p = lista[i];
    fraga = { p, tillLatin: Math.random() < 0.5 };
    const q = $("stav-q");
    q.replaceChildren("Vad heter ");
    if (fraga.tillLatin) q.append(p.sv);
    else q.append(Object.assign(document.createElement("em"), { textContent: p.latin }));
    q.append(fraga.tillLatin ? " på latin?" : " på svenska?");

    $("stav-svar").replaceChildren();
    const inp = $("stav-input");
    inp.value = "";
    inp.disabled = false;
    inp.placeholder = fraga.tillLatin ? "Latinskt namn" : "Svenskt namn";
    inp.classList.toggle("latin-svar", fraga.tillLatin);
    $("stav-skicka").hidden = false;
    $("stav-nasta").hidden = true;
    $("stav-raknare").textContent = `${i + 1} / ${lista.length}`;
    inp.focus({ preventScroll: true });
  }

  function skicka() {
    const svar = $("stav-input").value.trim();
    if (!svar) return $("stav-input").focus();
    const { p, tillLatin } = fraga;
    const facitNamn = tillLatin ? [p.latin, p.wiki].filter(Boolean) : [p.sv];
    const mojliga = facitNamn.map(norm);
    const ratt = mojliga.includes(norm(svar));
    const nara = !ratt && Math.min(...mojliga.map((r) => avstand(norm(svar), r))) <= 2;

    const rubrik = document.createElement("p");
    rubrik.className = "stav-resultat " + (ratt ? "ratt" : "fel");
    rubrik.textContent = ratt ? "✓ Rätt!" : nara ? "✗ Nästan!" : "✗ Fel";
    const facit = document.createElement("p");
    facit.className = "stav-facit";
    const namn = Object.assign(document.createElement(tillLatin ? "em" : "strong"), { textContent: tillLatin ? p.latin : p.sv });
    if (ratt) facit.append(namn);
    else facit.append(tillLatin ? "Rätt stavning: " : "Rätt svar: ", namn);
    $("stav-svar").replaceChildren(rubrik, facit);

    $("stav-input").disabled = true;
    $("stav-skicka").hidden = true;
    $("stav-nasta").hidden = false;
    $("stav-nasta").focus({ preventScroll: true });
  }

  function nasta() {
    i++;
    if (i >= lista.length) {
      // Varvet är klart – blanda och börja om
      lista = shuffle(lista);
      i = 0;
    }
    nyFraga();
  }

  function visa() {
    lista = shuffle(plants.filter((p) => selected.has(p.id)));
    i = 0;
    nyFraga();
  }

  function init() {
    $("stav-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if ($("stav-skicka").hidden) nasta(); else skicka();
    });
    $("stav-nasta").addEventListener("click", nasta);
  }

  return { init, visa };
})();
