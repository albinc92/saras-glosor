// Gör om kryssen i kursens ståndortstabell till en mening.
// Kryss anges per kategori, åtskilda med |, i ordningen Ljus | Fukt | Näring | pH | Jord:
//   Ljus:   S (sol)  H (halvskugga)  Sk (skugga)
//   Fukt:   T (torrt)  TF (torrt-friskt)  F (friskt/medel)  Fu (fuktigt)  B (blött)
//   Näring: Ma (magert)  Me (medel)  N (näringsrikt)
//   pH:     L (lågt)  M (medel)  H (högt/kalkhaltigt)
//   Jord:   ler, mel, sand (mineraljord – lerig/mellan/sandig)  hum (humusrik)  mull (mull/torvbaserad)
// Ex: "S H | F Fu | Me N | M H | ler mel hum"

const STANDORT = (() => {
  const LJ = [["S", "sol"], ["H", "halvskugga"], ["Sk", "skugga"]];
  const FU = [["T", "torr"], ["TF", "torr-frisk"], ["F", "frisk"], ["Fu", "fuktig"], ["B", "blöt"]];
  const NA = [["Ma", "mager"], ["Me", "medelnäringsrik"], ["N", "näringsrik"]];
  const PH = [["L", "lågt"], ["M", "medel"], ["H", "högt"]];
  const JO = [["ler", "lerig mineraljord"], ["mel", "mellan mineraljord"], ["sand", "sandig mineraljord"],
    ["hum", "humusrik jord"], ["mull", "mull/torvbaserad jord"]];
  const MIN = { ler: "lerig", mel: "mellan", sand: "sandig" };

  const eller = (a) => a.length > 1 ? a.slice(0, -1).join(", ") + " eller " + a.at(-1) : a[0];
  const och = (a) => a.length > 1 ? a.slice(0, -1).join(", ") + " och " + a.at(-1) : a[0];
  const utom = (val, sk) => sk.filter(([k]) => !val.includes(k)).map(([, n]) => n);

  // Sammanhängande val på en skala skrivs "X till Y", annars uppräknat
  function skala(val, sk) {
    const idx = val.map((k) => {
      const i = sk.findIndex(([x]) => x === k);
      if (i < 0) throw new Error("Okänt kryss: " + k);
      return i;
    });
    const sammanh = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    if (idx.length > 1 && sammanh) return sk[idx[0]][1] + " till " + sk[idx.at(-1)][1];
    return eller(idx.map((i) => sk[i][1]));
  }

  return function standort(kryss) {
    const [lj, fu, na, ph, jo] = kryss.split("|").map((s) => s.trim().split(/\s+/).filter(Boolean));
    const trivs = [];

    // Ljus (3 nivåer)
    let ljus = null;
    if (lj.length === 3) trivs.push("både sol och skugga");
    else ljus = skala(lj, LJ);

    // Fukt (5 nivåer) – minst 3 ikryssade: "alla utom …"
    let fukt = null;
    if (fu.length === 5) trivs.push("alla fuktnivåer");
    else if (fu.length >= 3) trivs.push("alla fuktnivåer utom " + och(utom(fu, FU)) + " jord");
    else fukt = skala(fu, FU);

    // Näring (3 nivåer)
    let naring = null;
    if (na.length === 3) trivs.push("alla näringsnivåer");
    else naring = skala(na, NA).replace("medelnäringsrik till", "medel- till");

    // Jord (5 typer) – minst 3 ikryssade: "alla utom …"
    let jord = null;
    const min = jo.filter((k) => MIN[k]);
    if (jo.length === 5) trivs.push("alla jordar");
    else if (jo.length === 3 && min.length === 3) trivs.push("alla mineraljordar");
    else if (jo.length >= 3) {
      const ut = utom(jo, JO);
      // "lerig och sandig mineraljord" i stället för "lerig mineraljord och sandig mineraljord"
      const utMin = ut.filter((n) => n.endsWith("mineraljord")).map((n) => n.replace(" mineraljord", ""));
      const utOvr = ut.filter((n) => !n.endsWith("mineraljord"));
      trivs.push("alla jordar utom " + och([...(utMin.length ? [och(utMin) + " mineraljord"] : []), ...utOvr]));
    } else {
      const delar = [];
      if (min.length) delar.push(min.map((k) => MIN[k]).join("/") + " mineraljord");
      if (jo.includes("hum")) delar.push("humusrik jord");
      if (jo.includes("mull")) delar.push("mull/torvbaserad jord");
      jord = eller(delar);
    }

    // pH (3 nivåer)
    let phTxt = null;
    if (ph.length === 3) trivs.push("alla pH-nivåer");
    else {
      phTxt = skala(ph, PH);
      phTxt = phTxt === "medel" ? "medel-pH" : phTxt + " pH";
    }

    const adj = [fukt, naring].filter(Boolean);
    const mark = adj.length || jord ? adj.join(", ") + (adj.length ? " " : "") + (jord || "jord") : null;
    let pref = [ljus, mark].filter(Boolean).join(" och ");
    if (phTxt) pref += (pref ? " med " : "") + phTxt;

    const t = [];
    if (pref) t.push("Föredrar " + pref + ".");
    if (trivs.length) t.push("Trivs i " + (trivs.length > 1 ? trivs.slice(0, -1).join(", ") + " samt " + trivs.at(-1) : trivs[0]) + ".");
    return t.join(" ");
  };
})();

if (typeof module !== "undefined") module.exports = STANDORT;
