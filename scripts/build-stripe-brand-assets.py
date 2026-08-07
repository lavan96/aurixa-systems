#!/usr/bin/env python3
"""
Build the Stripe branding assets from the single Aurixa Systems logo source.

Stripe's account branding takes two images — an `icon` (square, shown almost
everywhere: emails, Checkout, the customer portal, the hosted invoice page and
invoice PDFs) and a `logo` (non-square, used on Checkout and invoice PDFs).
Both must be PNG or JPG, at least 128x128, and under 512 KB. Those limits are
asserted at the end of this script rather than trusted, because Stripe rejects
an oversized file at upload time with a message that does not name the file.

Everything is derived from `public/brand/aurixa-systems-logo-source.jpg` — which
is, despite the extension, a PNG carrying a real alpha channel. That matters:
the mark is gold artwork on transparency, not gold on white, so it can be
composited onto the brand's own ground rather than knocked out of a white one.

Both marks are rendered on the opaque `--color-base-950` ground (#040B16) that
the marketing site itself paints, with the same radial "reactor" glow behind the
symbol. That is a deliberate choice over shipping the transparent art directly:
Stripe places these images on surfaces we do not control — a white invoice PDF,
a white panel on the hosted invoice page, a dark email body — and gold on white
is the weak case (about 2.5:1). A self-contained dark tile reads the same
everywhere and keeps the dark identity on the surfaces Stripe insists on
painting white.

The transparent variants are written too. Nothing uploads them today; they are
the correct source for any surface whose background we *do* control.

    python3 scripts/build-stripe-brand-assets.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "brand" / "aurixa-systems-logo-source.jpg"
OUT_DIR = ROOT / "public" / "brand" / "stripe"

# --- Brand ground -----------------------------------------------------------
# --color-base-950 and --color-base-900 from src/index.css. The glow is the
# same two-stop radial the site paints behind the hero symbol.
GROUND = (0x04, 0x0B, 0x16)
GLOW = (0x0B, 0x16, 0x2C)
GOLD = (0xC8, 0x9B, 0x3C)

# Stripe's stated limits.
MIN_EDGE = 128
MAX_BYTES = 512 * 1024

# Alpha below this is glow fringing, not artwork; measuring the bounding box
# against it stops a few near-invisible pixels dictating the crop.
INK = 6

# The symbol and the wordmark are one image. This column splits them: the
# source has a genuine gap there (peak alpha per column falls to ~0.1% of the
# lockup's mean), so nothing is cut through.
SPLIT_X = 872


def bbox(img: Image.Image, box: tuple[int, int, int, int] | None = None) -> tuple[int, int, int, int]:
    """Tight bounding box of everything above the ink threshold."""
    alpha = img.getchannel("A")
    if box:
        alpha = alpha.crop(box)
    mask = alpha.point(lambda v: 255 if v > INK else 0)
    found = mask.getbbox()
    if not found:
        raise SystemExit("no artwork found in the requested region")
    if box:
        return (found[0] + box[0], found[1] + box[1], found[2] + box[0], found[3] + box[1])
    return found


def ground(size: tuple[int, int], glow_at: tuple[float, float], glow_r: float) -> Image.Image:
    """The opaque brand ground with a radial glow centred on the symbol.

    Built by resizing a small radial gradient rather than by evaluating a
    per-pixel function — the result is identical at this scale and it keeps the
    script fast enough to run inline.
    """
    w, h = size
    n = 96
    grad = Image.new("RGB", (n, n))
    px = grad.load()
    half = (n - 1) / 2
    for y in range(n):
        for x in range(n):
            d = min(1.0, (((x - half) / half) ** 2 + ((y - half) / half) ** 2) ** 0.5)
            # Smooth falloff; the glow is gone well before the tile edge so the
            # corners are exactly GROUND and any rounding Stripe applies is
            # invisible.
            t = (1.0 - d) ** 2.2
            px[x, y] = tuple(round(GROUND[i] + (GLOW[i] - GROUND[i]) * t) for i in range(3))

    d = round(glow_r * 2)
    glow = grad.resize((d, d), Image.LANCZOS)
    base = Image.new("RGB", size, GROUND)
    base.paste(glow, (round(glow_at[0] - glow_r), round(glow_at[1] - glow_r)))
    return base


def place(art: Image.Image, canvas: tuple[int, int], scale: float) -> tuple[Image.Image, tuple[int, int], float]:
    """Fit `art` inside `canvas` at `scale` of the limiting axis, centred."""
    cw, ch = canvas
    aw, ah = art.size
    factor = min(cw * scale / aw, ch * scale / ah)
    resized = art.resize((max(1, round(aw * factor)), max(1, round(ah * factor))), Image.LANCZOS)
    at = ((cw - resized.width) // 2, (ch - resized.height) // 2)
    return resized, at, factor


def save(img: Image.Image, name: str) -> Path:
    path = OUT_DIR / name
    img.save(path, "PNG", optimize=True)
    return path


def main() -> int:
    if not SOURCE.exists():
        raise SystemExit(f"missing brand source: {SOURCE}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    src = Image.open(SOURCE).convert("RGBA")
    lockup = src.crop(bbox(src))
    symbol = src.crop(bbox(src, (0, 0, SPLIT_X, src.height)))

    written: list[Path] = []

    # --- Icon: square, symbol only ------------------------------------------
    # 512px rather than the 128px floor because Stripe serves this at 2x on
    # retina Checkout and in the portal header; downscaling is free, the
    # source has the resolution, and the file still lands well under the cap.
    icon_size = (512, 512)
    art, at, _ = place(symbol, icon_size, 0.78)
    icon = ground(icon_size, (icon_size[0] / 2, icon_size[1] / 2), icon_size[0] * 0.62)
    icon = icon.convert("RGBA")
    icon.alpha_composite(art, at)
    written.append(save(icon.convert("RGB").convert("RGBA"), "aurixa-stripe-icon-dark-512.png"))

    # --- Logo: the full lockup ----------------------------------------------
    # Stripe scales this to fit a fixed box on the invoice PDF and on Checkout,
    # so padding declared here is padding rendered there. PAD is even on all
    # four sides — a ratio-based inset would have left the wordmark closer to
    # the top and bottom edges than to the left and right on a 3:1 tile.
    LOGO_W = 1600
    PAD = 72
    lw, lh = lockup.size
    art_w = LOGO_W - 2 * PAD
    art_h = round(art_w * lh / lw)
    logo_size = (LOGO_W, art_h + 2 * PAD)
    art = lockup.resize((art_w, art_h), Image.LANCZOS)
    at = (PAD, PAD)
    # The glow sits behind the symbol, which is at the left of the lockup, not
    # in the middle of the canvas.
    sym_centre_x = PAD + art_w * (symbol.width / lw) / 2
    logo = ground(logo_size, (sym_centre_x, logo_size[1] / 2), logo_size[1] * 0.9).convert("RGBA")
    logo.alpha_composite(art, at)
    written.append(save(logo.convert("RGB").convert("RGBA"), "aurixa-stripe-logo-dark.png"))

    # --- Transparent variants ------------------------------------------------
    # Not uploaded. The correct source wherever we own the background.
    t_icon = Image.new("RGBA", icon_size, (0, 0, 0, 0))
    art, at, _ = place(symbol, icon_size, 0.78)
    t_icon.alpha_composite(art, at)
    written.append(save(t_icon, "aurixa-stripe-icon-transparent-512.png"))

    t_logo = Image.new("RGBA", logo_size, (0, 0, 0, 0))
    t_logo.alpha_composite(lockup.resize((art_w, art_h), Image.LANCZOS), (PAD, PAD))
    written.append(save(t_logo, "aurixa-stripe-logo-transparent.png"))

    # --- Assert Stripe's limits ----------------------------------------------
    failures = []
    for path in written:
        img = Image.open(path)
        size = path.stat().st_size
        if min(img.size) < MIN_EDGE:
            failures.append(f"{path.name}: {img.size[0]}x{img.size[1]} is under Stripe's {MIN_EDGE}px floor")
        if size > MAX_BYTES:
            failures.append(f"{path.name}: {size / 1024:.0f} KB is over Stripe's 512 KB cap")
        print(f"  {path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {size / 1024:.0f} KB")

    icon_img = Image.open(written[0])
    if icon_img.size[0] != icon_img.size[1]:
        failures.append("icon must be square")

    if failures:
        for f in failures:
            print(f"FAIL {f}", file=sys.stderr)
        return 1
    print("\nAll assets within Stripe's limits (square icon, >=128px, <512 KB).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
