// Ståndort ur kursens tabell. Kryss anges per kategori, åtskilda med |, i ordningen
// Ljus | Fukt | Näring | pH | Jord:
//   Ljus:   S (sol)  H (halvskugga)  Sk (skugga)
//   Fukt:   T (torrt)  TF (torrt-friskt)  F (friskt/medel)  Fu (fuktigt)  B (blött)
//   Näring: Ma (magert)  Me (medel)  N (näringsrikt)
//   pH:     L (lågt)  M (medel)  H (högt/kalkhaltigt)
//   Jord:   ler, mel, sand (mineraljord – lerig/mellan/sandig)  hum (humusrik)  mull (mull/torvbaserad)
// Ex: "S H | F Fu | Me N | M H | ler mel hum"

const STANDORT = (() => {
  // [nyckel, rubrik, alternativ [kod, namn]] – alternativen i skalans ordning
  const KATEGORIER = [
    ["ljus", "Ljus", [["S", "sol"], ["H", "halvskugga"], ["Sk", "skugga"]]],
    ["fukt", "Fuktnivå", [["T", "torr"], ["TF", "torr-frisk"], ["F", "frisk"], ["Fu", "fuktig"], ["B", "blöt"]]],
    ["naring", "Näringsnivå", [["Ma", "mager"], ["Me", "medel"], ["N", "näringsrik"]]],
    ["ph", "pH-nivå", [["L", "lågt"], ["M", "medel"], ["H", "högt/kalkhaltigt"]]],
    ["jord", "Jord", [["ler", "lerig mineraljord"], ["mel", "mellan mineraljord"], ["sand", "sandig mineraljord"],
      ["hum", "humusrik jord"], ["mull", "mull/torvbaserad jord"]]],
  ];
  const MIN = { ler: "lerig", mel: "mellan", sand: "sandig" };

  const eller = (a) => a.length > 1 ? a.slice(0, -1).join(", ") + " eller " + a.at(-1) : a[0];
  const och = (a) => a.length > 1 ? a.slice(0, -1).join(", ") + " och " + a.at(-1) : a[0];
  const stor = (s) => s[0].toUpperCase() + s.slice(1);

  // { ljus: ["S", "H"], fukt: [...], ... }
  function tolka(kryss) {
    const delar = kryss.split("|").map((s) => s.trim().split(/\s+/).filter(Boolean));
    return Object.fromEntries(KATEGORIER.map(([k, , alt], i) => {
      delar[i].forEach((kod) => { if (!alt.some(([x]) => x === kod)) throw new Error(`Okänt kryss i ${k}: ${kod}`); });
      return [k, delar[i]];
    }));
  }

  // Sammanhängande val på en skala skrivs "X till Y", annars uppräknat
  function skala(val, alt) {
    const idx = val.map((k) => alt.findIndex(([x]) => x === k));
    const sammanh = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    if (idx.length > 1 && sammanh) return alt[idx[0]][1] + " till " + alt[idx.at(-1)][1];
    return eller(idx.map((i) => alt[i][1]));
  }

  const utom = (val, alt) => alt.filter(([k]) => !val.includes(k)).map(([, n]) => n);

  function text(k, val, alt) {
    const alla = val.length === alt.length;
    switch (k) {
      case "ljus":
        return alla ? "Både sol och skugga" : stor(skala(val, alt));
      case "fukt":
        // Minst 3 av 5: skriv vad den inte trivs i
        if (alla) return "Alla fuktnivåer";
        if (val.length >= 3) return "Alla utom " + och(utom(val, alt));
        return stor(skala(val, alt));
      case "naring":
        return alla ? "Alla näringsnivåer" : stor(skala(val, alt));
      case "ph":
        return alla ? "Alla pH-nivåer" : stor(skala(val, alt));
      case "jord": {
        const min = val.filter((x) => MIN[x]);
        if (alla) return "Alla jordar";
        if (val.length === 3 && min.length === 3) return "Alla mineraljordar";
        if (val.length >= 3) {
          // "lerig och sandig mineraljord" i stället för "lerig mineraljord och sandig mineraljord"
          const ut = utom(val, alt);
          const utMin = ut.filter((n) => n.endsWith("mineraljord")).map((n) => n.replace(" mineraljord", ""));
          const utOvr = ut.filter((n) => !n.endsWith("mineraljord"));
          return "Alla utom " + och([...(utMin.length ? [och(utMin) + " mineraljord"] : []), ...utOvr]);
        }
        const delar = [];
        if (min.length) delar.push(min.map((x) => MIN[x]).join("/") + " mineraljord");
        if (val.includes("hum")) delar.push("humusrik jord");
        if (val.includes("mull")) delar.push("mull/torvbaserad jord");
        return stor(eller(delar));
      }
    }
  }

  // [[rubrik, text], …] – en rad per kategori
  function rader(kryss) {
    const t = tolka(kryss);
    return KATEGORIER.map(([k, rubrik, alt]) => [rubrik, text(k, t[k], alt)]);
  }

  return { KATEGORIER, tolka, rader };
})();

if (typeof module !== "undefined") module.exports = STANDORT;
