#!/usr/bin/env python3
"""
Build the Open Graph card and the raster app icons from the one logo source.

Two problems this solves, both of them things a link-preview scraper or a
browser tab does on every share and every page load:

**There was no `og:image`.** A link to aurixasystems.com.au pasted into
LinkedIn, Slack, WhatsApp or iMessage rendered as a bare URL. None of the
existing brand assets works as one: the Stripe logo tile is 1600x604 (2.65:1,
so it letterboxes or centre-crops against Open Graph's 1.91:1), the Stripe icon
is square (which downgrades the card to a small thumbnail), and
`aurixa-symbol.svg` is an SVG — no unfurler accepts SVG for `og:image`.

**The favicon was 548 KB.** `public/brand/aurixa-symbol.svg` is an SVG wrapper
around a base64-encoded JPEG, and it was the tab icon, so every page load paid
for it. A 32x32 PNG is about two kilobytes.

Everything derives from `public/brand/aurixa-systems-logo-source.jpg` — which,
despite the extension, is a PNG with a real alpha channel — and reuses the
ground, glow and placement helpers from `build-stripe-brand-assets.py` so the
two sets cannot drift apart. Same reasoning as that script for putting the mark
on an opaque dark ground rather than shipping transparency: we do not control
what an unfurler or an OS composites behind it, and gold on white is the weak
case.

    python3 scripts/build-share-assets.py
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# Reuse rather than re-derive. The module has a `__main__` guard, so importing
# it does not rebuild the Stripe assets.
_spec = importlib.util.spec_from_file_location(
    "aurixa_brand", ROOT / "scripts" / "build-stripe-brand-assets.py"
)
assert _spec and _spec.loader
brand = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(brand)

SOURCE = ROOT / "public" / "brand" / "aurixa-systems-logo-source.jpg"
BRAND_DIR = ROOT / "public" / "brand"

# Open Graph's canonical size. 1.91:1 — the ratio Facebook, LinkedIn, Slack and
# X all target, so a card built at it is never cropped by any of them.
OG_SIZE = (1200, 630)

# LinkedIn and WhatsApp are the strict ones on file size.
OG_MAX_BYTES = 1024 * 1024

# iOS home-screen icon. 180x180 is the largest any current device asks for.
APPLE_TOUCH = 180
FAVICON = 32


def main() -> int:
    if not SOURCE.exists():
        print(f"missing source: {SOURCE}", file=sys.stderr)
        return 1

    source = Image.open(SOURCE).convert("RGBA")
    lockup = source.crop(brand.bbox(source))
    symbol = source.crop(brand.bbox(source, (0, 0, brand.SPLIT_X, source.height)))

    written: list[Path] = []

    # --- The Open Graph card -------------------------------------------------
    # The full lockup, centred, at 62% of the canvas. Wide enough to read as a
    # brand card in a feed at thumbnail size; short of the edges so no platform
    # that applies its own rounded corners clips the wordmark.
    card = brand.ground(OG_SIZE, (OG_SIZE[0] / 2, OG_SIZE[1] / 2), OG_SIZE[1] * 1.05).convert("RGBA")
    art, at, _ = brand.place(lockup, OG_SIZE, 0.62)
    card.alpha_composite(art, at)
    path = BRAND_DIR / "og-default.png"
    # No alpha: some clients composite onto white, and gold-on-white is the
    # weak case this whole approach exists to avoid.
    card.convert("RGB").save(path, "PNG", optimize=True)
    written.append(path)

    # --- Raster app icons ----------------------------------------------------
    for size, name in ((APPLE_TOUCH, "apple-touch-icon.png"), (FAVICON, "favicon-32.png")):
        canvas = (size, size)
        icon = brand.ground(canvas, (size / 2, size / 2), size * 0.9).convert("RGBA")
        art, at, _ = brand.place(symbol, canvas, 0.78)
        icon.alpha_composite(art, at)
        path = BRAND_DIR / name
        icon.convert("RGB").save(path, "PNG", optimize=True)
        written.append(path)

    # --- Assert the constraints rather than trusting them --------------------
    failures = []
    for path in written:
        img = Image.open(path)
        size = path.stat().st_size
        print(f"  {path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {size / 1024:.1f} KB")
        if path.name == "og-default.png":
            if img.size != OG_SIZE:
                failures.append(f"{path.name}: {img.size} is not {OG_SIZE[0]}x{OG_SIZE[1]}")
            if size > OG_MAX_BYTES:
                failures.append(f"{path.name}: {size / 1024:.0f} KB is over the 1 MB share limit")
        if img.mode == "RGBA":
            failures.append(f"{path.name}: still carries an alpha channel")

    if failures:
        for f in failures:
            print(f"FAIL {f}", file=sys.stderr)
        return 1
    print("\nShare assets built: 1200x630 OG card, 180px apple-touch icon, 32px favicon.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
