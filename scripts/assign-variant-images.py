#!/usr/bin/env python3
"""
Assign correct Shopify product images to each variant.
Product: 4-in-1 Non-Slip Phone Dash Mat (ID: 15089798545774)

Based on visual analysis of all 35 product images.
"""
import json
import urllib.request
import os
import time

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "dc5byu-fy")
SHOPIFY_TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
API_BASE = f"https://{SHOPIFY_STORE}.myshopify.com/admin/api/2024-01"

# Image-to-variant mapping — verified against CJ Dropshipping Products Connection video
# Format: variant_id -> image_id
#
# Key distinction from CJ video:
#   "Red" = SOLID red accent lines + "BAVISS" branding (image 27/34 in CJ)
#   "Red A" = DASHED/BROKEN red border lines (image 29/34 in CJ)
#
VARIANT_IMAGE_MAP = {
    # ── Red: Solid red accent lines + "BAVISS" branding ──
    # CJ image 27/34: rectangular mat, solid red border lines, "BAVISS" at top
    54343583924590: 65606813712750,   # Red / 1PC → pos 4 (top-down BAVISS mat)
    54343583957358: 65606814433646,   # Red / 2PCS → pos 26 (2pcs red mat top-down)

    # ── White: White accent lines ──
    54343583990126: 65606814597486,   # White / 1PC → pos 31 (white accent top-down)
    54343584022894: 65606814237038,   # White / 2PCS → pos 20 (white 2pcs)

    # ── Black: All-black, no colored accents ──
    # CJ image 22/34: marketing picture, all black mat
    54343584055662: 65606813843822,   # Black / 1PC → pos 8 (all-black mat)
    54343584350574: 65606813843822,   # Black / 2PCS → pos 8 (reuse, no 2pcs black img)

    # ── Red A: Dashed/broken red border lines (DIFFERENT from Red) ──
    # CJ image 29/34: mat with dashed red border, parking numbers
    54343584383342: 65606813745518,   # Red A / 1PC → pos 5 (dashed red border mat)
    54343584416110: 65606813647214,   # Red A / 2PCS → pos 2 (dashed red mat collage)

    # ── Cartoon: Colorful cartoon animal characters ──
    54343584448878: 65606814007662,   # Cartoon / 1PC → pos 13 (cartoon oval mat)
    54343584481646: 65606814073198,   # Cartoon / 2PCS → pos 15 (cartoon 2pcs)

    # ── Chinese Dream: "中国梦 CHINESE DREAM" text in purple/red ──
    # CJ image shows purple/red "中国梦" text on mat
    54343584514414: 65606814531950,   # Chinese dream / 1PC → pos 29

    # ── Safe Journey: "一路平安" text in pink/red + purple gradient ──
    # CJ image 31/34: rectangular mat with "一路平安" + purple gradient
    54343584579950: 65606814564718,   # Safe journey / 1PC → pos 30

    # ── Single Bracket: Phone holder component only ──
    # CJ image 32/34: black phone bracket with red accent rings
    54343584612718: 65606814499182,   # Single bracket / 1PC → pos 28
}

# Also set correct retail prices
VARIANT_PRICES = {
    54343583924590: "9.99",    # Red / 1PC
    54343583957358: "16.99",   # Red / 2PCS
    54343583990126: "9.99",    # White / 1PC
    54343584022894: "16.99",   # White / 2PCS
    54343584055662: "9.99",    # Black / 1PC
    54343584350574: "16.99",   # Black / 2PCS
    54343584383342: "9.99",    # Red A / 1PC
    54343584416110: "16.99",   # Red A / 2PCS
    54343584448878: "9.99",    # Cartoon / 1PC
    54343584481646: "16.99",   # Cartoon / 2PCS
    54343584514414: "9.99",    # Chinese dream / 1PC
    54343584579950: "9.99",    # Safe journey / 1PC
    54343584612718: "9.99",    # Single bracket / 1PC
}

VARIANT_NAMES = {
    54343583924590: "Red / 1PC",
    54343583957358: "Red / 2PCS",
    54343583990126: "White / 1PC",
    54343584022894: "White / 2PCS",
    54343584055662: "Black / 1PC",
    54343584350574: "Black / 2PCS",
    54343584383342: "Red A / 1PC",
    54343584416110: "Red A / 2PCS",
    54343584448878: "Cartoon / 1PC",
    54343584481646: "Cartoon / 2PCS",
    54343584514414: "Chinese dream / 1PC",
    54343584579950: "Safe journey / 1PC",
    54343584612718: "Single bracket / 1PC",
}


def patch_variant(token, variant_id, image_id, price):
    """PATCH a single variant with new image and price."""
    payload = json.dumps({
        "variant": {
            "id": variant_id,
            "image_id": image_id,
            "price": price,
        }
    }).encode()

    req = urllib.request.Request(
        f"{API_BASE}/variants/{variant_id}.json",
        data=payload,
        headers={
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
        },
        method="PATCH",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            return True, data
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return False, f"HTTP {e.code}: {body[:200]}"


def main():
    if not SHOPIFY_TOKEN:
        print("ERROR: SHOPIFY_ACCESS_TOKEN not set in environment")
        print("Set it with: export SHOPIFY_ACCESS_TOKEN=shpat_...")
        return 1

    print("=" * 60)
    print("Product Image Assignment — 4-in-1 Non-Slip Phone Dash Mat")
    print("=" * 60)
    print()

    success = 0
    failed = 0

    for variant_id, image_id in VARIANT_IMAGE_MAP.items():
        name = VARIANT_NAMES[variant_id]
        price = VARIANT_PRICES[variant_id]

        ok, result = patch_variant(SHOPIFY_TOKEN, variant_id, image_id, price)

        if ok:
            success += 1
            print(f"  ✅ {name:25s} → image {image_id}, price ${price}")
        else:
            failed += 1
            print(f"  ❌ {name:25s} → FAILED: {result}")

        time.sleep(0.35)  # rate limit

    print()
    print(f"Done: {success} succeeded, {failed} failed, {len(VARIANT_IMAGE_MAP)} total")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit(main())
