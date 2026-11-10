// Stavning: "Vad heter X på latin?" eller "Vad heter Y på svenska?" – man skriver svaret och får det rättat.
// Använder de växter som är valda i "Välj växter" (plants/selected från app.js).

const STAVNING = (() => {
  const $ = (id) => document.getElementById(id);

  let lista = [];
  let i = 0;
  let fraga = null; // { p, tillLatin }
  let antalRatt = 0;
  let klar = false;

  // Jämför utan hänsyn till skiftläge, accenter, ×, citattecken och extra mellanslag
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/(^|\s)x(?=\s)/g, " ").replace(/[×'’‘"]/g, "").replace(/\s+/g, " ").trim();

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
    q.textContent = `Vad heter ${fraga.tillLatin ? p.sv : p.latin} på ${fraga.tillLatin ? "latin" : "svenska"}?`;

    $("stav-svar").replaceChildren();
    const inp = $("stav-input");
    inp.value = "";
    inp.disabled = false;
    inp.placeholder = fraga.tillLatin ? "Latinskt namn" : "Svenskt namn";
    $("stav-skicka").hidden = false;
    $("stav-nasta").hidden = true;
    $("stav-raknare").textContent = `${i + 1} / ${lista.length} · ${antalRatt} rätt`;
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
    if (ratt) antalRatt++;
    $("stav-raknare").textContent = `${i + 1} / ${lista.length} · ${antalRatt} rätt`;

    const rubrik = document.createElement("p");
    rubrik.className = "stav-resultat " + (ratt ? "ratt" : "fel");
    rubrik.textContent = ratt ? "✓ Rätt!" : nara ? "✗ Nästan!" : "✗ Fel";
    const facit = document.createElement("p");
    facit.className = "stav-facit";
    const namn = Object.assign(document.createElement("strong"), { textContent: tillLatin ? p.latin : p.sv });
    if (ratt) facit.append(namn);
    else facit.append(tillLatin ? "Rätt stavning: " : "Rätt svar: ", namn);
    $("stav-svar").replaceChildren(rubrik, facit);

    $("stav-input").disabled = true;
    $("stav-skicka").hidden = true;
    $("stav-nasta").textContent = i === lista.length - 1 ? "Visa resultat" : "Nästa";
    $("stav-nasta").hidden = false;
    $("stav-nasta").focus({ preventScroll: true });
  }

  // Slutresultat efter ett helt varv
  function resultat() {
    klar = true;
    const andel = antalRatt / lista.length;
    $("stav-raknare").textContent = "";
    $("stav-q").textContent = `Klart! ${antalRatt} av ${lista.length} rätt`;
    const kommentar = document.createElement("p");
    kommentar.className = "stav-facit";
    kommentar.textContent = andel === 1 ? "Alla rätt – snyggt!" : andel >= 0.8 ? "Riktigt bra!" : andel >= 0.5 ? "Bra jobbat – kör ett varv till!" : "Öva lite till, det sitter snart!";
    $("stav-svar").replaceChildren(kommentar);
    $("stav-input").parentElement.hidden = true;
    $("stav-nasta").textContent = "Kör igen";
    $("stav-nasta").focus({ preventScroll: true });
  }

  function nasta() {
    if (klar) return visa();
    i++;
    if (i >= lista.length) return resultat();
    nyFraga();
  }

  function visa() {
    lista = shuffle(plants.filter((p) => selected.has(p.id)));
    i = 0;
    antalRatt = 0;
    klar = false;
    $("stav-input").parentElement.hidden = false;
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
