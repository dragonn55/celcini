#!/usr/bin/env python3
"""Favicon, Apple touch icon ve og-cover.png üretir. Pillow gerekir (pip install pillow).

Logolar olduğu gibi kullanılır: yalnızca #0096C7 zemine yerleştirilip boyutlandırılır.
    python3 scripts/gorsel-uret.py
"""
from pathlib import Path
from PIL import Image

KOK = Path(__file__).resolve().parent.parent
IMG = KOK / "assets" / "img"
MAVI = (0, 150, 199, 255)  # #0096C7


def zemine_koy(logo, boyut, oran, radius=0):
    """logo'yu boyut×boyut (ya da (w,h)) mavi zemine, kısa kenarın `oran` katı kadar yer kaplayacak şekilde ortalar."""
    w, h = boyut if isinstance(boyut, tuple) else (boyut, boyut)
    zemin = Image.new("RGBA", (w, h), MAVI)
    kutu = logo.getbbox()
    kirp = logo.crop(kutu)
    hedef_h = int(h * oran)
    olcek = hedef_h / kirp.height
    hedef_w = int(kirp.width * olcek)
    if hedef_w > w * oran:
        olcek = (w * oran) / kirp.width
        hedef_w, hedef_h = int(kirp.width * olcek), int(kirp.height * olcek)
    kucuk = kirp.resize((hedef_w, hedef_h), Image.LANCZOS)
    zemin.alpha_composite(kucuk, ((w - hedef_w) // 2, (h - hedef_h) // 2))
    if radius:
        maske = Image.new("L", (w, h), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(maske).rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
        zemin.putalpha(maske)
    return zemin


gul = Image.open(IMG / "logo-gul-beyaz.png").convert("RGBA")
tam = Image.open(IMG / "logo-tam-beyaz.png").convert("RGBA")

# Favicon: #0096C7 kare içinde beyaz gül
for ad, boyut in [("favicon-32.png", 32), ("favicon-192.png", 192), ("favicon-512.png", 512), ("apple-touch-icon.png", 180)]:
    zemine_koy(gul, boyut, 0.78).save(IMG / ad, optimize=True)
zemine_koy(gul, 64, 0.78).save(KOK / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# Open Graph kapağı: 1200×630, ortada tam logo
zemine_koy(tam, (1200, 630), 0.58).convert("RGB").save(IMG / "og-cover.png", optimize=True)
print("üretildi: favicon-32/192/512, apple-touch-icon, favicon.ico, og-cover.png")
