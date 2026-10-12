// Gör om ett latinskt växtnamn till svenskt uttal enligt
// "Latinska uttalsregler och betoningsregler" (R. Iseborg, 1993).
// Betonad stavelse skrivs med versaler. Betoning kan anges med ' efter
// den betonade stavelsen, som i PDF:erna (t.ex. "Aquile'gia vulga'ris").
// Utan ' räknas betoningen ut med betoningsreglerna.

const UTTAL = (() => {
  const VOKAL = "aeiouy";
  const MJUK = ["e", "i", "y", "ae", "oe", "eu", "ei"];
  const DIFTONG = ["ae", "oe", "au", "eu", "ei", "ai", "oi", "ou"];
  const DIFTONG_LJUD = { ae: "e", oe: "e", au: "au", eu: "ev", ei: "ej", ai: "aj", oi: "åj", ou: "u" };
  const VOKAL_LJUD = { a: "a", e: "e", i: "i", o: "å", u: "u", y: "y" };
  // Muta cum liquida – räknas som en konsonant vid betoning och stavelsedelning
  const MCL = ["bl", "br", "chl", "chr", "cl", "cr", "dl", "dr", "fl", "fr", "gl", "gr", "kl", "kr",
    "phl", "phr", "pl", "pr", "thl", "thr", "tl", "tr"];
  // Ändelser där näst sista stavelsen bara följs av en konsonant – då kan bara
  // lexikon avgöra. Detta är de vanligaste fallen ur ändelselistan.
  const BETONAD = ["alis", "ale", "aris", "are", "atus", "ata", "atum", "osus", "osa", "osum",
    "orum", "inus", "ina", "inum", "anus", "ana", "anum", "ivus", "iva", "ivum", "utus", "uta", "utum",
    "etum", "florus", "flora", "florum", "ensis", "ense", "ellus", "ella", "ellum", "illus", "illa", "illum", "ulus"];
  const OBETONAD = ["icus", "ica", "icum", "idus", "ida", "idum", "ilis", "ile", "ulus", "ula", "ulum",
    "ifer", "iger", "imus", "ima", "imum", "olus", "ola", "olum"];

  const arMjuk = (s, i) => MJUK.some((m) => s.startsWith(m, i));
  const arVokal = (c) => VOKAL.includes(c);

  // Delar ett ord i ljudenheter: { v: vokalljud } eller { k: konsonantljud, b: bokstäver }
  function ljud(ord) {
    const s = ord;
    const ut = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      const rest = s.slice(i);
      const forst = i === 0;
      // Vokaler och diftonger
      if (arVokal(c)) {
        // i i början av ord före vokal uttalas j
        if (c === "i" && forst && arVokal(s[1] || "")) { ut.push({ k: "j", b: "i" }); i++; continue; }
        const d = s.slice(i, i + 2);
        if (DIFTONG.includes(d)) {
          const slut = !/[aeiouy]/.test(s.slice(i + 2));
          // eu i slutstavelse samt ändelserna -aum/-aus är inte diftonger
          const ejDiftong = (d === "eu" && slut) || (d === "au" && /^au[ms]$/.test(rest));
          if (!ejDiftong) { ut.push({ v: DIFTONG_LJUD[d], d: true, b: d }); i += 2; continue; }
        }
        ut.push({ v: VOKAL_LJUD[c], b: c });
        i++;
        continue;
      }
      // Konsonanter
      if (rest.startsWith("sch")) { ut.push({ k: arMjuk(s, i + 3) ? "sj" : "sk", b: "sch" }); i += 3; continue; }
      if (rest.startsWith("sc") && arMjuk(s, i + 2)) { ut.push({ k: "sj", b: "sc" }); i += 2; continue; }
      if (rest.startsWith("ch")) { ut.push({ k: forst && arMjuk(s, i + 2) ? "tj" : "k", b: "ch" }); i += 2; continue; }
      if (rest.startsWith("ph")) { ut.push({ k: "f", b: "ph" }); i += 2; continue; }
      if (rest.startsWith("th")) { ut.push({ k: "t", b: "th" }); i += 2; continue; }
      if (rest.startsWith("rh")) { ut.push({ k: "r", b: "rh" }); i += 2; continue; }
      if (rest.startsWith("qu")) { ut.push({ k: "k", b: "q" }, { k: "v", b: "u" }); i += 2; continue; }
      if (c === "c") { ut.push({ k: arMjuk(s, i + 1) ? "s" : "k", b: "c" }); i++; continue; }
      if (c === "g") {
        ut.push({ k: forst && arMjuk(s, i + 1) ? "j" : "g", b: "g" });
        // u uttalas v efter ng (före vokal)
        if (s[i - 1] === "n" && s[i + 1] === "u" && arVokal(s[i + 2] || "")) { ut.push({ k: "v", b: "u" }); i += 2; continue; }
        i++;
        continue;
      }
      // h uttalas svagt i början av ord, inte alls inuti ord
      if (c === "h") { ut.push({ k: forst ? "h" : "", b: "h" }); i++; continue; }
      if (c === "s" && forst && s[1] === "u" && arVokal(s[2] || "")) { ut.push({ k: "s", b: "s" }, { k: "v", b: "u" }); i += 2; continue; }
      if (c === "t" && s[i + 1] === "i" && arVokal(s[i + 2] || "") && !/[sx]/.test(s[i - 1] || "")) {
        ut.push({ k: "ts", b: "t" }); i++; continue;
      }
      if (c === "x") { ut.push({ k: "ks", b: "x" }); i++; continue; }
      if (c === "z") { ut.push({ k: forst ? "s" : "ts", b: "z" }); i++; continue; }
      if (c === "w") { ut.push({ k: "v", b: "w" }); i++; continue; }
      ut.push({ k: c, b: c });
      i++;
    }
    return ut;
  }

  // Delar ljudenheterna i stavelser
  function stavelser(enheter) {
    const st = [];
    let akt = [];
    let i = 0;
    while (i < enheter.length) {
      akt.push(enheter[i]);
      if (enheter[i].v !== undefined) {
        // Samla konsonanter fram till nästa vokal
        let j = i + 1;
        while (j < enheter.length && enheter[j].v === undefined) j++;
        if (j >= enheter.length) { akt.push(...enheter.slice(i + 1)); i = enheter.length; break; }
        const kons = enheter.slice(i + 1, j);
        let delning = 0; // antal konsonanter som stannar i denna stavelse
        if (kons.length >= 2) {
          const sista2 = kons.slice(-2).map((e) => e.b).join("");
          const qu = kons[kons.length - 2].b === "q" || kons[kons.length - 1].b === "u";
          delning = MCL.includes(sista2) || qu ? kons.length - 2 : kons.length - 1;
        }
        akt.push(...kons.slice(0, delning));
        st.push(akt);
        akt = kons.slice(delning);
        i = j;
        continue;
      }
      i++;
    }
    if (akt.length) {
      if (st.length && !akt.some((e) => e.v !== undefined)) st[st.length - 1].push(...akt);
      else st.push(akt);
    }
    return st;
  }

  // Räknar ut vilken stavelse (index) som ska betonas
  function betoning(ord, st) {
    const n = st.length;
    if (n <= 2) return 0;
    const pen = st[n - 2];
    const kärna = pen.findIndex((e) => e.v !== undefined);
    if (pen[kärna].d) return n - 2; // diftong
    const efter = pen.slice(kärna + 1).map((e) => e.b);
    const nasta = st[n - 1];
    // Vokal direkt före vokal – obetonad
    if (!efter.length && nasta[0].v !== undefined) return n - 3;
    // Vokalen följs av två eller flera konsonanter (ej muta cum liquida) – betonad
    if (efter.length) return n - 2;
    const k = nasta[0].b;
    if (k === "x" || k === "z") return n - 2;
    // En konsonant – titta i ändelselistan
    if (BETONAD.some((e) => ord.endsWith(e) && ord.length > e.length)) return n - 2;
    if (OBETONAD.some((e) => ord.endsWith(e) && ord.length > e.length)) return n - 3;
    return n - 3;
  }

  function ordUttal(raw) {
    const accent = raw.indexOf("'");
    const ord = raw.replace(/'/g, "");
    const enheter = ljud(ord);
    const st = stavelser(enheter);
    let b;
    if (accent > 0) {
      // Hitta stavelsen som innehåller bokstaven före '
      let pos = 0;
      b = st.findIndex((s) => (pos += s.reduce((n, e) => n + e.b.length, 0)) >= accent);
    } else {
      b = betoning(ord, st);
    }
    return st
      .map((s, i) => {
        const t = s.map((e) => e.v ?? e.k).join("");
        return i === b ? t.toUpperCase() : t;
      })
      .join("-");
  }

  return function uttal(namn) {
    return namn
      .toLowerCase()
      .replace(/[’`´]/g, "'")
      .replace(/×|(^|\s)x(?=\s|$)/g, " ")
      .replace(/-gruppen\b/g, "")
      .split(/[\s-]+/)
      .filter(Boolean)
      .map(ordUttal)
      .join(" ");
  };
})();

if (typeof module !== "undefined") module.exports = UTTAL;
