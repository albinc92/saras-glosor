"""Hämtar en bild per växt från Wikipedia/Wikimedia Commons och gör WebP i flera storlekar.

Kör: python tools/fetch_images.py   (kräver Pillow)
Resultat: img/<id>-<w>.webp och data/credits.json
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


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


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
    plants = json.loads((ROOT / "data/plants.json").read_text(encoding="utf-8"))
    credits_path = ROOT / "data/credits.json"
    credits = json.loads(credits_path.read_text(encoding="utf-8")) if credits_path.exists() else {}
    (ROOT / "img").mkdir(exist_ok=True)

    for p in plants:
        if p["id"] in credits and all((ROOT / f"img/{p['id']}-{w}.webp").exists() for w in WIDTHS):
            continue
        name = p.get("image") or page_image(p["wiki"])
        if not name:
            print("SAKNAR BILD:", p["latin"], file=sys.stderr)
            continue
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
                ROOT / f"img/{p['id']}-{w}.webp", "WEBP", quality=72, method=6)
        credits[p["id"]] = {
            "file": name,
            "page": info["descriptionurl"],
            "author": strip_html(meta.get("Artist", {}).get("value")),
            "license": strip_html(meta.get("LicenseShortName", {}).get("value")),
        }
        print("OK", p["latin"], "<-", name)
        time.sleep(0.5)

    credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
