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

# Image-to-variant mapping based on visual analysis
# Format: variant_id -> image_id
VARIANT_IMAGE_MAP = {
    # Red: Red accent lines on black mat (rectangular 4-in-1 form)
    # pos_1: lifestyle shot in car with phone holder + keys
    54343583924590: 65626385351022,   # Red / 1PC → pos 1

    # Red / 2PCS: pos_26 shows the 2pcs red accent mat
    54343583957358: 65606814433646,   # Red / 2PCS → pos 26

    # White: White accent lines on black mat
    # pos_31: clean top-down view of white variant
    54343583990126: 65606814597486,   # White / 1PC → pos 31

    # White / 2PCS: pos_20 shows 2pcs white variant
    54343584022894: 65606814237038,   # White / 2PCS → pos 20

    # Black: All black, no colored accents
    # pos_8: all-black mat in car
    54343584055662: 65606813843822,   # Black / 1PC → pos 8

    # Black / 2PCS: reuse the black product shot (no dedicated 2pcs black image)
    54343584350574: 65606813843822,   # Black / 2PCS → pos 8

    # Red A: Different red variant (angled product shot showing Aroma branding)
    # pos_5: angled view with "Aroma" and "BAVISS" branding, red accent
    54343584383342: 65606813745518,   # Red A / 1PC → pos 5

    # Red A / 2PCS: red accent mat collage/lifestyle
    # pos_2: collage showing red mat usage
    54343584416110: 65606813647214,   # Red A / 2PCS → pos 2

    # Cartoon: Cute animal characters (cat, duck, pig) on oval mat with red border
    # pos_13: clear view of cartoon oval mat
    54343584448878: 65606814007662,   # Cartoon / 1PC → pos 13

    # Cartoon / 2PCS: same cartoon design, 2pcs label
    # pos_15: cartoon 2pcs view
    54343584481646: 65606814073198,   # Cartoon / 2PCS → pos 15

    # Chinese Dream: Large rectangular mat with "中国梦 CHINESE DREAM" text
    # pos_29: in-car shot showing Chinese Dream text clearly
    54343584514414: 65606814531950,   # Chinese dream / 1PC → pos 29

    # Safe Journey: Large rectangular mat with "一路平安" text
    # pos_30: in-car shot showing Safe Journey text
    54343584579950: 65606814564718,   # Safe journey / 1PC → pos 30

    # Single Bracket: Just the phone holder/bracket component, no mat
    # pos_28: shows the bracket alone
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
