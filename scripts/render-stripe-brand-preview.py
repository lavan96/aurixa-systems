#!/usr/bin/env python3
"""
Render what a customer receives once the Aurixa brand is on the Stripe account.

This is a REVIEW artefact, not a shipping surface. Stripe owns the templates
for receipts, the hosted invoice page and invoice PDFs; what we control is four
fields on `account.settings.branding` plus the invoice footer and tax display.
This script takes those exact values — the same PNGs that get uploaded, the
same two hex colours, the same footer string — and lays them into Stripe's
document structure so the palette can be judged before it is applied to a live
account and starts landing in customers' inboxes.

Read it as a colour-and-mark proof, not a pixel-exact replica of Stripe's HTML.

Three surfaces, because they behave differently and the difference is the whole
point of the palette:

  Email receipt        the accent colour is the page background → fully dark
  Hosted invoice page  accent behind, Stripe's own white sheet on top → both
  Invoice PDF          always white paper; the logo and brand colour carry it

    python3 scripts/render-stripe-brand-preview.py [outdir]

Writes one self-contained HTML file per surface plus PNGs, if a Chromium is
findable (Playwright's, or anything on PATH).
"""

from __future__ import annotations

import base64
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "public" / "brand" / "stripe"

# The four values that are actually applied to Stripe, mirrored from
# aurixa-mission-control/src/lib/brand/aurixa-brand.ts.
GOLD = "#C89B3C"          # settings.branding.primary_color
GROUND = "#040B16"        # settings.branding.secondary_color — the dark one
GOLD_LIGHT = "#F5D17A"
BASE_900 = "#0B162C"
CYAN = "#00A8B5"
FOOTER = (
    "Aurixa System Pty Ltd · aurixasystems.com.au\n"
    "All amounts are in AUD and include GST.\n"
    "Questions about this invoice: admin@aurixasystems.com.au"
)

# A representative bill: one seat plan and one module, both at their real
# catalog prices. The workspace is invented — this is a design proof, and
# putting a real customer's name on a mock invoice is how a mock gets forwarded
# to them by accident.
CUSTOMER = "Harbourline Advisory Pty Ltd"
CUSTOMER_ADDR = ["Level 6, 122 Walker Street", "North Sydney NSW 2060", "Australia"]
LINES = [
    ("Aurixa Growth — 5–15 seats", "7 Aug – 6 Sep 2026", 86000),
    ("AML / CTF Compliance module", "7 Aug – 6 Sep 2026", 19500),
]
TOTAL = sum(cents for _, _, cents in LINES)
GST = round(TOTAL / 11)                  # tax-inclusive: divide by 11, never ×1.1
EX_GST = TOTAL - GST
INVOICE_NO = "9F3C21A0-0007"
RECEIPT_NO = "2432-1195"
PAID_ON = "7 August 2026"
CARD = "Visa •••• 3499"


def aud(cents: int) -> str:
    return f"${cents / 100:,.2f}"


def data_uri(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


# Inter is the site's `--font-sans`, and the preview is worthless in a fallback
# face — half of what is being judged here is how the type sits against the
# gold. Headless Chromium will not reliably finish a webfont request inside a
# screenshot run, so the font is fetched once and inlined as a data URI. If
# there is no network, the stylesheet link is the fallback and a real browser
# opening the file still gets Inter.
INTER_WOFF2 = (
    "https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2"
)
FONT_LINK_FALLBACK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
    "family=Inter:wght@400;500;600;700&display=swap\">"
)


def font_face() -> str:
    """Inter as an inlined @font-face, or the stylesheet link if offline."""
    try:
        import urllib.request

        with urllib.request.urlopen(INTER_WOFF2, timeout=15) as res:
            woff2 = base64.b64encode(res.read()).decode()
        return (
            "<style>@font-face{font-family:Inter;font-style:normal;font-weight:100 900;"
            f"font-display:block;src:url(data:font/woff2;base64,{woff2}) format('woff2')}}</style>"
        )
    except Exception as err:  # noqa: BLE001 — any failure means "no network"
        print(f"  (Inter not inlined: {err}; falling back to the Google Fonts link)")
        return FONT_LINK_FALLBACK

# Everything below inherits this. `-inspect` is the neutral surround the
# panels sit on; it is NOT part of the brand and exists so a dark panel and a
# white panel can be judged on the same sheet.
BASE_CSS = f"""
*,*::before,*::after {{ box-sizing: border-box; }}
body {{ margin:0; font-family:Inter,system-ui,sans-serif; -webkit-font-smoothing:antialiased;
        background:#6b7280; padding:40px; }}
.caption {{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#f3f4f6;
            margin:0 0 10px; font-weight:600; }}
.caption span {{ color:#d1d5db; font-weight:400; letter-spacing:.02em; text-transform:none; }}
.sheet {{ margin:0 auto 44px; }}
table {{ width:100%; border-collapse:collapse; }}
.num {{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }}
"""


# ── 1. Email receipt ────────────────────────────────────────────────────────
# The accent colour is the email's background, so this surface is the one that
# goes fully dark. Stripe picks readable text over whatever it is given; the
# gold is used the way Stripe uses the brand colour — the action button and the
# section rules.
def email_receipt(icon: str) -> str:
    rows = "".join(
        f"""<tr>
              <td style="padding:9px 0;border-bottom:1px solid rgba(200,155,60,.16)">
                <div style="color:#E8EDF5;font-size:13px;font-weight:500">{name}</div>
                <div style="color:#8A97AB;font-size:11px;margin-top:2px">{period}</div>
              </td>
              <td class="num" style="padding:9px 0;border-bottom:1px solid rgba(200,155,60,.16);
                  color:#E8EDF5;font-size:13px">{aud(cents)}</td>
            </tr>"""
        for name, period, cents in LINES
    )
    facts = [("Amount paid", aud(TOTAL)), ("Date paid", PAID_ON), ("Payment method", CARD)]
    fact_cells = "".join(
        f"""<td style="padding-right:26px;vertical-align:top">
              <div style="color:#8A97AB;font-size:10px;letter-spacing:.1em;
                   text-transform:uppercase">{label}</div>
              <div style="color:#FFFFFF;font-size:14px;font-weight:600;margin-top:5px">{value}</div>
            </td>"""
        for label, value in facts
    )
    return f"""
<div class="sheet" style="max-width:600px">
  <p class="caption">Email receipt <span>— accent colour is the email background, so this
     surface is fully dark</span></p>
  <div style="background:{GROUND};padding:36px 34px 30px;border-radius:10px">

    <table><tr>
      <td style="width:46px"><img src="{icon}" width="46" height="46"
          style="display:block;border-radius:9px"></td>
      <td style="padding-left:13px">
        <div style="color:#FFFFFF;font-size:15px;font-weight:600;letter-spacing:.01em">
          Aurixa Systems</div>
        <div style="color:#8A97AB;font-size:11px;margin-top:1px">aurixasystems.com.au</div>
      </td>
    </tr></table>

    <div style="color:#FFFFFF;font-size:22px;font-weight:600;margin:26px 0 4px;
         letter-spacing:-.01em">Receipt from Aurixa Systems</div>
    <div style="color:#8A97AB;font-size:12px">Receipt #{RECEIPT_NO}</div>

    <div style="height:1px;background:rgba(200,155,60,.28);margin:22px 0 20px"></div>

    <table><tr>{fact_cells}</tr></table>

    <!-- Stripe paints the action button in the BRAND colour and picks the ink
         itself; black on this gold is the higher-contrast choice at ~5.9:1. -->
    <a href="#" style="display:inline-block;margin-top:24px;background:{GOLD};color:#000000;
       font-size:13px;font-weight:600;text-decoration:none;padding:11px 20px;border-radius:6px">
       Download invoice</a>

    <div style="color:{GOLD_LIGHT};font-size:10px;letter-spacing:.16em;text-transform:uppercase;
         margin:32px 0 6px;font-weight:600">Summary</div>
    <table>{rows}
      <tr><td style="padding:11px 0 3px;color:#8A97AB;font-size:12px">Subtotal</td>
          <td class="num" style="padding:11px 0 3px;color:#B6C0D4;font-size:12px">{aud(TOTAL)}</td></tr>
      <tr><td style="padding:3px 0;color:#8A97AB;font-size:12px">GST (10%, included)</td>
          <td class="num" style="padding:3px 0;color:#B6C0D4;font-size:12px">{aud(GST)}</td></tr>
      <tr><td style="padding:11px 0 0;border-top:1px solid rgba(200,155,60,.28);color:#FFFFFF;
              font-size:14px;font-weight:600">Amount paid</td>
          <td class="num" style="padding:11px 0 0;border-top:1px solid rgba(200,155,60,.28);
              color:{GOLD_LIGHT};font-size:14px;font-weight:600">{aud(TOTAL)}</td></tr>
    </table>

    <div style="margin-top:28px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08);
         color:#71809A;font-size:11px;line-height:1.6">
      {"<br>".join(FOOTER.split(chr(10)))}
    </div>
  </div>
</div>"""


# ── 2. Hosted invoice page ──────────────────────────────────────────────────
# Two panels: the accent colour behind, Stripe's own white invoice sheet on
# top. Worth seeing precisely because it is the surface where the dark and the
# light treatment meet, and where a badly chosen pair would show.
def hosted_page(icon: str) -> str:
    rows = "".join(
        f"""<tr>
              <td style="padding:8px 0;border-bottom:1px solid #E9ECF1;color:#1A1F36;font-size:12px">
                {name}<div style="color:#8792A2;font-size:10.5px;margin-top:2px">{period}</div></td>
              <td class="num" style="padding:8px 0;border-bottom:1px solid #E9ECF1;color:#1A1F36;
                  font-size:12px">{aud(cents)}</td>
            </tr>"""
        for name, period, cents in LINES
    )
    return f"""
<div class="sheet" style="max-width:940px">
  <p class="caption">Hosted invoice page <span>— accent behind, Stripe's white invoice sheet on
     top; the one surface where both treatments meet</span></p>
  <div style="display:flex;border-radius:10px;overflow:hidden;min-height:420px">

    <div style="flex:0 0 44%;background:{GROUND};padding:40px 36px;
         background-image:radial-gradient(70% 60% at 30% 30%,{BASE_900} 0%,{GROUND} 70%)">
      <img src="{icon}" width="40" height="40" style="display:block;border-radius:8px">
      <div style="color:#8A97AB;font-size:12px;margin-top:26px">Invoice from Aurixa Systems</div>
      <div style="color:#FFFFFF;font-size:34px;font-weight:600;margin-top:6px;
           letter-spacing:-.02em">{aud(TOTAL)}</div>
      <div style="color:#8A97AB;font-size:12px;margin-top:4px">Due 7 August 2026</div>
      <a href="#" style="display:block;text-align:center;margin-top:28px;background:{GOLD};
         color:#000000;font-size:13px;font-weight:600;text-decoration:none;padding:12px 0;
         border-radius:6px">Pay {aud(TOTAL)}</a>
      <div style="margin-top:18px;display:flex;gap:18px">
        <a href="#" style="color:{GOLD_LIGHT};font-size:11.5px;text-decoration:none">Download invoice</a>
        <a href="#" style="color:{GOLD_LIGHT};font-size:11.5px;text-decoration:none">Copy link</a>
      </div>
      <div style="margin-top:34px;color:#71809A;font-size:11px;line-height:1.6">
        {"<br>".join(FOOTER.split(chr(10)))}
      </div>
    </div>

    <div style="flex:1;background:#FFFFFF;padding:40px 36px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="color:#1A1F36;font-size:15px;font-weight:600">Invoice</div>
          <div style="color:#8792A2;font-size:11px;margin-top:3px;font-variant-numeric:tabular-nums">
            #{INVOICE_NO}</div>
        </div>
        <!-- Brand colour on a white sheet: Stripe uses it for the status pill
             and the rules, which is the whole of its job on a light surface.
             This surface is shown OPEN rather than paid — it is the page a
             customer is sent to in order to pay, so a "paid" pill beside a
             "Pay" button would be a state that never occurs. -->
        <span style="background:{GOLD}22;color:#7A5C1E;border:1px solid {GOLD}66;font-size:10px;
              font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;
              border-radius:99px">Due</span>
      </div>
      <div style="height:2px;background:{GOLD};margin:16px 0 20px;width:44px"></div>
      <div style="color:#8792A2;font-size:10px;letter-spacing:.1em;text-transform:uppercase">
        Billed to</div>
      <div style="color:#1A1F36;font-size:12px;margin-top:5px;line-height:1.55">
        <strong>{CUSTOMER}</strong><br>{"<br>".join(CUSTOMER_ADDR)}</div>
      <table style="margin-top:24px">{rows}
        <tr><td style="padding:10px 0 3px;color:#8792A2;font-size:11.5px">Subtotal</td>
            <td class="num" style="padding:10px 0 3px;color:#1A1F36;font-size:11.5px">{aud(TOTAL)}</td></tr>
        <tr><td style="padding:3px 0;color:#8792A2;font-size:11.5px">GST (10%, included)</td>
            <td class="num" style="padding:3px 0;color:#1A1F36;font-size:11.5px">{aud(GST)}</td></tr>
        <tr><td style="padding:10px 0 0;border-top:1px solid #D8DEE7;color:#1A1F36;font-size:13px;
                font-weight:600">Amount due</td>
            <td class="num" style="padding:10px 0 0;border-top:1px solid #D8DEE7;color:#1A1F36;
                font-size:13px;font-weight:600">{aud(TOTAL)}</td></tr>
      </table>
    </div>
  </div>
</div>"""


# ── 3. Invoice PDF ──────────────────────────────────────────────────────────
# Always white paper — Stripe gives no control over it, and a dark-flooded A4
# is a wasted cartridge. The identity is carried by the logo (a dark tile,
# which is exactly why the marks are built opaque rather than transparent) and
# by the brand colour on the rules and the total.
def invoice_pdf(logo: str) -> str:
    rows = "".join(
        f"""<tr>
              <td style="padding:11px 0;border-bottom:1px solid #EDEFF3;color:#1A1F36;font-size:12px">
                {name}<div style="color:#8792A2;font-size:10.5px;margin-top:2px">{period}</div></td>
              <td class="num" style="padding:11px 0;border-bottom:1px solid #EDEFF3;color:#8792A2;
                  font-size:12px">1</td>
              <td class="num" style="padding:11px 0;border-bottom:1px solid #EDEFF3;color:#1A1F36;
                  font-size:12px">{aud(cents)}</td>
            </tr>"""
        for name, period, cents in LINES
    )
    return f"""
<div class="sheet" style="max-width:794px">
  <p class="caption">Invoice PDF <span>— white paper by Stripe's design; the dark logo tile and the
     brand colour carry the identity</span></p>
  <div style="background:#FFFFFF;padding:52px 56px 44px;min-height:900px;position:relative">

    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <img src="{logo}" style="display:block;width:230px;border-radius:4px">
      <div style="text-align:right">
        <div style="color:#1A1F36;font-size:24px;font-weight:600;letter-spacing:-.01em">Invoice</div>
        <div style="color:#8792A2;font-size:11px;margin-top:4px;font-variant-numeric:tabular-nums">
          #{INVOICE_NO}</div>
      </div>
    </div>

    <div style="height:3px;background:{GOLD};margin:26px 0 0"></div>

    <table style="margin-top:26px">
      <tr>
        <td style="width:50%;vertical-align:top">
          <div style="color:#8792A2;font-size:10px;letter-spacing:.1em;text-transform:uppercase">From</div>
          <div style="color:#1A1F36;font-size:12px;margin-top:6px;line-height:1.6">
            <strong>Aurixa System Pty Ltd</strong><br>42 Seymour Way<br>Kellyville NSW 2155<br>Australia
          </div>
        </td>
        <td style="width:50%;vertical-align:top">
          <div style="color:#8792A2;font-size:10px;letter-spacing:.1em;text-transform:uppercase">Bill to</div>
          <div style="color:#1A1F36;font-size:12px;margin-top:6px;line-height:1.6">
            <strong>{CUSTOMER}</strong><br>{"<br>".join(CUSTOMER_ADDR)}
          </div>
        </td>
      </tr>
    </table>

    <table style="margin-top:26px">
      <tr>
        <td><div style="color:#8792A2;font-size:10px;letter-spacing:.1em;text-transform:uppercase">
              Date of issue</div>
            <div style="color:#1A1F36;font-size:12px;margin-top:5px">{PAID_ON}</div></td>
        <td><div style="color:#8792A2;font-size:10px;letter-spacing:.1em;text-transform:uppercase">
              Date due</div>
            <div style="color:#1A1F36;font-size:12px;margin-top:5px">{PAID_ON}</div></td>
        <td class="num">
            <div style="color:#8792A2;font-size:10px;letter-spacing:.1em;text-transform:uppercase">
              Amount paid</div>
            <div style="color:{GOLD};font-size:20px;font-weight:600;margin-top:3px">{aud(TOTAL)}</div></td>
      </tr>
    </table>

    <table style="margin-top:34px">
      <thead><tr>
        <th style="text-align:left;padding-bottom:9px;border-bottom:2px solid {GOLD};color:#1A1F36;
            font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600">Description</th>
        <th class="num" style="padding-bottom:9px;border-bottom:2px solid {GOLD};color:#1A1F36;
            font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;width:70px">Qty</th>
        <th class="num" style="padding-bottom:9px;border-bottom:2px solid {GOLD};color:#1A1F36;
            font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;width:120px">Amount</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>

    <!-- rendering_options.amount_tax_display = include_inclusive_tax. Every
         Aurixa price is tax-INCLUSIVE, so the line items must read at the
         figure the customer was quoted and the GST is shown as contained
         within it — not added underneath. -->
    <table style="margin-top:18px;width:290px;margin-left:auto">
      <tr><td style="padding:5px 0;color:#8792A2;font-size:11.5px">Subtotal</td>
          <td class="num" style="padding:5px 0;color:#1A1F36;font-size:11.5px">{aud(TOTAL)}</td></tr>
      <tr><td style="padding:5px 0;color:#8792A2;font-size:11.5px">Total excluding GST</td>
          <td class="num" style="padding:5px 0;color:#1A1F36;font-size:11.5px">{aud(EX_GST)}</td></tr>
      <tr><td style="padding:5px 0;color:#8792A2;font-size:11.5px">GST — Australia (10%, included)</td>
          <td class="num" style="padding:5px 0;color:#1A1F36;font-size:11.5px">{aud(GST)}</td></tr>
      <tr><td style="padding:10px 0 5px;border-top:1px solid #D8DEE7;color:#1A1F36;font-size:13px;
              font-weight:600">Total</td>
          <td class="num" style="padding:10px 0 5px;border-top:1px solid #D8DEE7;color:#1A1F36;
              font-size:13px;font-weight:600">{aud(TOTAL)}</td></tr>
      <tr><td style="padding:5px 0;color:#1A1F36;font-size:13px;font-weight:600">Amount paid</td>
          <td class="num" style="padding:5px 0;color:{GOLD};font-size:13px;font-weight:600">
            {aud(TOTAL)}</td></tr>
    </table>

    <div style="position:absolute;left:56px;right:56px;bottom:40px;padding-top:16px;
         border-top:1px solid #EDEFF3;color:#8792A2;font-size:10.5px;line-height:1.7">
      {"<br>".join(FOOTER.split(chr(10)))}
    </div>
  </div>
</div>"""


def page(title: str, body: str, font: str) -> str:
    return (
        f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
        f"<title>{title}</title>{font}<style>{BASE_CSS}</style></head>"
        f"<body>{body}</body></html>"
    )


def trim(png: Path, pad: int = 36) -> None:
    """Crop the uniform inspection ground off the bottom and right.

    Chromium screenshots the WINDOW, not the document, so every surface comes
    out padded to whatever height was requested. Cropping to the content keeps
    a tall panel and a short one comparable.
    """
    try:
        from PIL import Image
    except ImportError:
        return
    img = Image.open(png).convert("RGB")
    w, h = img.size
    ground = img.getpixel((w - 2, h - 2))
    px = img.load()

    bottom = h
    while bottom > 1 and all(px[x, bottom - 1] == ground for x in range(0, w, 7)):
        bottom -= 1
    right = w
    while right > 1 and all(px[right - 1, y] == ground for y in range(0, bottom, 7)):
        right -= 1

    img.crop((0, 0, min(w, right + pad), min(h, bottom + pad))).save(png)


def find_chromium() -> str | None:
    if env := os.environ.get("CHROMIUM"):
        return env
    for candidate in ("chromium", "chromium-browser", "google-chrome", "chrome"):
        if found := shutil.which(candidate):
            return found
    # Playwright's managed download, which is what CI and the sandbox have.
    for root in (Path("/opt/pw-browsers"), Path.home() / ".cache" / "ms-playwright"):
        if root.is_dir():
            for chrome in sorted(root.glob("chromium*/chrome-linux/chrome")):
                return str(chrome)
    return None


def shoot(chrome: str, html: Path, png: Path, width: int, height: int = 2600) -> bool:
    proc = subprocess.run(
        [
            chrome, "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
            "--force-device-scale-factor=2", f"--window-size={width},{height}",
            "--virtual-time-budget=6000", f"--screenshot={png}", f"file://{html}",
        ],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        print(f"  chromium failed for {png.name}: {proc.stderr.strip()[:200]}", file=sys.stderr)
    if not png.exists():
        return False
    trim(png)
    return True


def main() -> int:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / ".preview" / "stripe-brand"
    out.mkdir(parents=True, exist_ok=True)

    icon_png = BRAND / "aurixa-stripe-icon-dark-512.png"
    logo_png = BRAND / "aurixa-stripe-logo-dark.png"
    for path in (icon_png, logo_png):
        if not path.exists():
            raise SystemExit(f"missing {path}. Run scripts/build-stripe-brand-assets.py first.")
    icon, logo = data_uri(icon_png), data_uri(logo_png)

    surfaces = [
        ("email-receipt", "Aurixa · Stripe email receipt", email_receipt(icon), 680),
        ("hosted-invoice-page", "Aurixa · Stripe hosted invoice page", hosted_page(icon), 1020),
        ("invoice-pdf", "Aurixa · Stripe invoice PDF", invoice_pdf(logo), 874),
    ]

    chrome = find_chromium()
    if not chrome:
        print("No Chromium found; writing HTML only. Set CHROMIUM= to render PNGs.")
    font = font_face()

    for name, title, body, width in surfaces:
        html = out / f"{name}.html"
        html.write_text(page(title, body, font), encoding="utf-8")
        print(f"  {html}")
        if chrome and shoot(chrome, html, out / f"{name}.png", width):
            print(f"  {out / f'{name}.png'}")

    combined = out / "all-surfaces.html"
    combined.write_text(
        page("Aurixa · Stripe brand preview", "".join(b for _, _, b, _ in surfaces), font),
        encoding="utf-8",
    )
    print(f"  {combined}")
    if chrome:
        shoot(chrome, combined, out / "all-surfaces.png", 1020, height=3400)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
