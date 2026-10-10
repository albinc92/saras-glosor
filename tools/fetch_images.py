"""Hämtar bilderna i "images" för varje växt (eller huvudbilden från Wikipedia) från Wikipedia/Wikimedia Commons och gör WebP i flera storlekar.

Kör: python tools/fetch_images.py   (kräver Pillow)
Resultat: img/<id>-<nr>-<w>.webp och data/credits.json
"""
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
UA = "saras-glosor/1.0 (https://github.com/albinc92/saras-glosor)"
WIDTHS = [400, 800, 1200]


def get(url, tries=6):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            # Wikimedia begränsar antal anrop – vänta och försök igen
            if e.code != 429 or i == tries - 1:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 5 * 2 ** i)


def api(host, **params):
    params |= {"format": "json", "formatversion": "2"}
    return json.loads(get(f"https://{host}/w/api.php?" + urllib.parse.urlencode(params)))


def page_image(title):
    for host in ("en.wikipedia.org", "sv.wikipedia.org"):
        d = api(host, action="query", titles=title, prop="pageimages",
                piprop="name", redirects=1)
        page = d["query"]["pages"][0]
        if page.get("pageimage"):
            return page["pageimage"]
    return None


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    plants = json.loads((ROOT / "data/plants.json").read_text(encoding="utf-8"))
    credits_path = ROOT / "data/credits.json"
    credits = json.loads(credits_path.read_text(encoding="utf-8")) if credits_path.exists() else {}
    (ROOT / "img").mkdir(exist_ok=True)

    for p in plants:
        names = p.get("images") or [page_image(p["wiki"])]
        old = credits.get(p["id"], [])
        new = []
        for n, name in enumerate(names):
            if not name:
                print("SAKNAR BILD:", p["latin"], file=sys.stderr)
                continue
            if (n < len(old) and old[n]["file"].replace("_", " ") == name.replace("_", " ")
                    and all((ROOT / f"img/{p['id']}-{n}-{w}.webp").exists() for w in WIDTHS)):
                new.append(old[n])
                continue
            new.append(fetch(p["id"], n, name))
            print("OK", p["latin"], n, "<-", name)
            time.sleep(0.5)
        credits[p["id"]] = new
        # Spara löpande så att ett avbrott inte tappar det som redan hämtats
        credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")


def fetch(pid, n, name):
    d = api("commons.wikimedia.org", action="query", titles=f"File:{name}",
            prop="imageinfo", iiprop="url|extmetadata", iiurlwidth=1600)
    info = d["query"]["pages"][0]["imageinfo"][0]
    meta = info["extmetadata"]
    img = Image.open(io.BytesIO(get(info.get("thumburl") or info["url"])))
    img = ImageOps.exif_transpose(img).convert("RGB")
    # Beskär till 4:5 (porträtt) så korten blir enhetliga
    img = ImageOps.fit(img, (1200, 1500), centering=(0.5, 0.45))
    for w in WIDTHS:
        img.resize((w, w * 5 // 4), Image.LANCZOS).save(
            ROOT / f"img/{pid}-{n}-{w}.webp", "WEBP", quality=72, method=6)
    return {
        "file": name,
        "page": info["descriptionurl"],
        "author": strip_html(meta.get("Artist", {}).get("value")),
        "license": strip_html(meta.get("LicenseShortName", {}).get("value")),
    }


if __name__ == "__main__":
    main()
