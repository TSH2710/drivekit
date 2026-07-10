#!/usr/bin/env python3
"""
Seasonal Sale Runner — Start or End sales by tag.
Start: Sets compareAtPrice = price / (1 - discount%) on all variants of matching products.
End:   Clears compareAtPrice (sets to null) on all variants of matching products.
"""
import json
import urllib.request
import os
import time
import math

STORE = os.environ.get("SHOPIFY_STORE_DOMAIN", "dc5byu-fy.myshopify.com")
TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
API_VERSION = "2024-10"
BASE = f"https://{STORE}/admin/api/{API_VERSION}"

HEADERS = {
    "X-Shopify-Access-Token": TOKEN,
    "Content-Type": "application/json",
}

ACTION = "start"       # start or end
TAG = "summer"         # tag to filter
DISCOUNT_PCT = 20      # only used when ACTION=start


def api_get(path):
    req = urllib.request.Request(f"{BASE}{path}", headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def api_put(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=HEADERS, method="PUT")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


# --- Phase 1: Fetch products by tag ---
print(f"Phase 1: Fetching products tagged '{TAG}'...")
all_products = []
page = 1
while True:
    resp = api_get(f"/products.json?limit=250&page={page}")
    products = resp.get("products", [])
    if not products:
        break
    for p in products:
        tags = [t.strip().lower() for t in p.get("tags", [])]
        if TAG.lower() in tags:
            all_products.append(p)
    page += 1

print(f"Found {len(all_products)} products tagged '{TAG}'")

# --- Phase 2: Compute & push variant updates ---
multiplier = 1.0 / (1.0 - DISCOUNT_PCT / 100.0) if ACTION == "start" else None
total_variants = 0
errors = []

for p in all_products:
    pid = p["id"]
    title = p["title"]
    variants = p.get("variants", [])

    updates = []
    for v in variants:
        vid = v["id"]
        price = float(v["price"])
        if ACTION == "start":
            new_compare = math.ceil(price * multiplier * 100) / 100
            new_compare_str = f"{new_compare:.2f}"
            updates.append({"id": vid, "compare_at_price": new_compare_str})
        else:
            updates.append({"id": vid, "compare_at_price": None})

    for i in range(0, len(updates), 10):
        batch = updates[i:i+10]
        try:
            api_put(f"/products/{pid}.json", {
                "product": {"id": pid, "variants": batch}
            })
            total_variants += len(batch)
            time.sleep(0.5)
        except Exception as e:
            errors.append(f"{title}: {e}")
            print(f"  ❌ {title}: {e}")

    verb = "SALE" if ACTION == "start" else "ENDED"
    print(f"  ✅ [{verb}] {title} ({len(variants)} variants)")

# --- Phase 3: Verification ---
print(f"\nPhase 3: Verifying...")
verified = 0
sample = all_products[:3]
for p in sample:
    resp = api_get(f"/products/{p['id']}.json")
    product = resp.get("product", {})
    for v in product.get("variants", []):
        price = float(v["price"])
        cap = v.get("compare_at_price")
        if ACTION == "start":
            if cap and float(cap) > price:
                verified += 1
            else:
                print(f"  ⚠️ {p['title']} ({v['title']}): cap={cap}, price={price}")
        else:
            if cap is None:
                verified += 1
            else:
                print(f"  ⚠️ {p['title']} ({v['title']}): cap={cap} (should be null)")

# --- Summary ---
print(f"\n{'='*60}")
print(f"Store:        {STORE}")
print(f"Action:       {ACTION.upper()}")
print(f"Tag:          {TAG}")
print(f"Discount:     {DISCOUNT_PCT}% (if start)")
print(f"Products:     {len(all_products)}")
print(f"Variants:     {total_variants}")
print(f"Errors:       {len(errors)}")
print(f"Verified:     {verified}/{len(sample) * 5} sample variants")
print(f"{'='*60}")

if errors:
    print("\nErrors:")
    for e in errors:
        print(f"  - {e}")
