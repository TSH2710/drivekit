#!/bin/bash
# Fix Shopify variants using curl

TOKEN="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"
API="https://dc5byu-fy.myshopify.com/admin/api/2024-10"
AUTH="X-Shopify-Access-Token: $TOKEN"

# Get auth token for cache refresh
SITE_AUTH="206477e54cc102f32315d43241cc22fce30b2d8177031914f275770f26883b48"

shopify_get() {
    curl -s -H "$AUTH" "$API/$1"
}

shopify_put() {
    curl -s -X PUT -H "$AUTH" -H "Content-Type: application/json" -d "$2" "$API/$1"
}

shopify_patch() {
    curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" -d "$2" "$API/$1"
}

echo "=== Step 1: Fetch all Shopify products ==="
ALL_PRODUCTS="[]"
PAGE=1
while true; do
    RESP=$(shopify_get "products.json?limit=30&page=$PAGE")
    COUNT=$(echo "$RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('products',[])))" 2>/dev/null)
    if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
        break
    fi
    echo "  Page $PAGE: $COUNT products"
    PAGE=$((PAGE + 1))
    sleep 0.5
done
TOTAL_PAGES=$((PAGE - 1))
echo "Total pages: $TOTAL_PAGES"

echo ""
echo "=== Step 2: Compare CJ CSV with Shopify ==="

# Build the fix list using Python (handles the complex matching)
python3 << 'PYEOF'
import csv, json, subprocess, time, sys
from collections import defaultdict

API = "https://dc5byu-fy.myshopify.com/admin/api/2024-10"
TOKEN = "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"

def shopify_get(path):
    import urllib.request
    url = f"{API}/{path}"
    req = urllib.request.Request(url, headers={"X-Shopify-Access-Token": TOKEN, "Accept": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def shopify_put(path, data):
    import urllib.request
    url = f"{API}/{path}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={"X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json", "Accept": "application/json"}, method='PUT')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  PUT ERROR: {e}")
        return None

def shopify_patch(path, data):
    import urllib.request
    url = f"{API}/{path}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={"X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json", "Accept": "application/json"}, method='PATCH')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  PATCH ERROR: {e}")
        return None

# Parse CJ CSV
cj_products = defaultdict(list)
with open('files/Added-Products-20260722-2607220527271926100_Sheet1_.csv', 'r') as f:
    for row in csv.DictReader(f):
        cj_products[row['Product Title'].strip()].append(row['Specification'].strip())

title_map = {
    "Car heating cushion": "12V Car Seat Heating Cushion",
    "Car accessories armrest box pad": "Car Armrest Box Cushion Pad",
    "Car Humidifier Air Purifier Freshener Essential Oil Diffuser": "Car Aromatherapy Diffuser & Purifier",
    "Car Light Turn Signal Led Strip Car LED Daytime Running": "LED Turn Signal Light Strip",
    "Foam Spray Gun High Pressure Automotive Foam Spray Gun Household Cleaner Generator": "High Pressure Foam Spray Gun",
    "Two-color Couble-sided Car Dual-use Cleaning Car Wash Towel": "Microfiber Car Detailing Towels",
    "Wireless Car Vacuum Cleaner Portable Handheld High-power Vacuum Cleaner For Car Home Office Keyboard Cleaning": "Cordless Car Vacuum Cleaner",
    "PU Leather Car Storage Bag Multifunction Seat Back Tray Hanging Bag Waterproof Car Organizer Automotive Interior Accessories": "Premium Seatback Car Organizer",
    "Solar Auto Rotation Car Air Freshener Perfume Seat": "Solar Rotating Car Air Freshener",
    "Automobile headlight repair liquid": "Headlight Restoration Repair Liquid",
    "Inflatable Mattress Camping Car Air Mattress Car Travel Mattress Outdoor Car Pillow Bed": "Inflatable Car Travel Air Mattress",
    "Crystal Diamond Car Air Freshener Perfume Accessories Car Decoration Solid Perfume": "Crystal Diamond Car Air Freshener",
}

# Fetch products one at a time (urllib works with limit=1)
print("Fetching Shopify products...")
all_products = []
for page in range(1, 4):  # 3 pages * 30 = 90 products max
    try:
        data = shopify_get(f"products.json?limit=30&page={page}")
        products = data.get("products", [])
        if not products:
            break
        all_products.extend(products)
        print(f"  Page {page}: {len(products)} products")
        time.sleep(0.5)
    except Exception as e:
        print(f"  Page {page} error: {e}")
        break

shopify_by_title = {p['title']: p for p in all_products}
print(f"Total products: {len(all_products)}")

# Find products needing fixes
to_fix = []
for cj_title, cj_specs in cj_products.items():
    shopify_title = title_map.get(cj_title)
    if not shopify_title or shopify_title not in shopify_by_title:
        continue
    sp = shopify_by_title[shopify_title]
    existing_variants = [v.get('option1', '') for v in sp.get('variants', []) if v.get('option1') and v['option1'] not in ('Default Title', 'Default')]
    missing = [s for s in cj_specs if s not in existing_variants]
    if missing:
        to_fix.append({
            'shopify_title': shopify_title,
            'shopify_id': sp['id'],
            'existing_variants': existing_variants,
            'cj_specs': cj_specs,
            'missing_specs': missing,
            'images': sp.get('images', []),
        })

print(f"\n{len(to_fix)} products need variant fixes:")
for item in to_fix:
    print(f"  {item['shopify_title'][:55]:55s} | Missing: {len(item['missing_specs'])}")

# Fix each product
total_created = 0
total_mapped = 0

for item in to_fix:
    pid = item['shopify_id']
    title = item['shopify_title']
    missing = item['missing_specs']
    images = item['images']

    print(f"\n{'='*80}")
    print(f"Fixing: {title} (ID: {pid})")

    # Fetch fresh product data
    fresh = shopify_get(f"products/{pid}.json")
    product = fresh.get('product', {})
    
    existing_variant_objs = []
    for v in product.get('variants', []):
        opt1 = v.get('option1') or v.get('title', 'Default Title')
        existing_variant_objs.append({
            "id": v['id'],
            "option1": opt1,
            "price": str(v.get('price', '14.99')),
        })

    # ALL specs = existing + missing
    all_specs = [v['option1'] for v in existing_variant_objs] + missing

    # Remove Default Title / Default entries
    all_specs = [s for s in all_specs if s not in ('Default Title', 'Default', 'Option 1')]
    existing_variant_objs = [v for v in existing_variant_objs if v['option1'] not in ('Default Title', 'Default', 'Option 1')]

    # Add any missing specs not already in existing
    existing_set = set(v['option1'] for v in existing_variant_objs)
    new_variants = [{"option1": s, "price": "14.99"} for s in missing if s not in existing_set]
    all_variants = existing_variant_objs + new_variants
    all_specs_final = [v['option1'] for v in all_variants]

    print(f"  Total variants after fix: {len(all_variants)}")

    result = shopify_put(f"products/{pid}.json", {
        "product": {
            "id": pid,
            "options": [{"name": "Variant", "values": all_specs_final}],
            "variants": all_variants,
        }
    })

    if not result:
        print(f"  ❌ Failed to update product")
        continue

    updated_variants = result.get('product', {}).get('variants', [])
    print(f"  ✅ Product updated — {len(updated_variants)} variants")
    total_created += len(new_variants)

    # Assign images to variants by position
    product_images = [img for img in images if img.get('alt', '') != 'AI Generated Lifestyle Image']
    image_ids = [img['id'] for img in product_images]

    if image_ids:
        # Fetch fresh variant data
        time.sleep(0.5)
        fresh2 = shopify_get(f"products/{pid}.json")
        fresh_variants = fresh2.get('product', {}).get('variants', [])
        
        variant_by_opt = {}
        for v in fresh_variants:
            opt = v.get('option1', '')
            if opt and opt not in ('Default Title', 'Default', 'Option 1'):
                variant_by_opt[opt] = v

        assigned = 0
        for i, spec in enumerate(all_specs_final):
            if i >= len(image_ids):
                break
            if spec in variant_by_opt:
                vid = variant_by_opt[spec]['id']
                current_img = variant_by_opt[spec].get('image_id')
                if current_img == image_ids[i]:
                    continue
                res = shopify_patch(f"variants/{vid}.json", {
                    "variant": {"id": vid, "image_id": image_ids[i]}
                })
                if res:
                    assigned += 1
                time.sleep(0.4)

        print(f"  📷 Assigned {assigned}/{min(len(all_specs_final), len(image_ids))} variant images")
        total_mapped += assigned
    else:
        print(f"  ⚠️ No non-AI images to map")

    time.sleep(0.8)

print(f"\n{'='*80}")
print(f"SUMMARY: {len(to_fix)} products fixed, {total_created} variants created, {total_mapped} images mapped")

# Refresh cache
print("\nRefreshing product cache...")
import urllib.request
req = urllib.request.Request(
    f"https://drivekit-production.up.railway.app/api/shopify/cache/refresh",
    headers={"Authorization": f"Bearer 206477e54cc102f32315d43241cc22fce30b2d8177031914f275770f26883b48"}
)
try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        print(f"Cache refreshed: {result}")
except Exception as e:
    print(f"Cache refresh error: {e}")
PYEOF

echo ""
echo "Done!"
