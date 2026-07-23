#!/usr/bin/env python3
"""Fix Shopify variants using subprocess curl (urllib gets 400 from Shopify)."""
import csv, json, time, subprocess
from collections import defaultdict

API = "https://dc5byu-fy.myshopify.com/admin/api/2024-10"
TOKEN = "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"
SITE_AUTH = "206477e54cc102f32315d43241cc22fce30b2d8177031914f275770f26883b48"

def shopify_get(path):
    r = subprocess.run(['curl', '-s', '-H', f'X-Shopify-Access-Token: {TOKEN}', f'{API}/{path}'],
                       capture_output=True, text=True)
    return json.loads(r.stdout)

def shopify_put(path, data):
    r = subprocess.run(['curl', '-s', '-X', 'PUT', '-H', f'X-Shopify-Access-Token: {TOKEN}',
                        '-H', 'Content-Type: application/json', '-d', json.dumps(data),
                        f'{API}/{path}'], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except:
        print(f"  PUT parse error: {r.stdout[:200]}")
        return None

def shopify_patch(path, data):
    r = subprocess.run(['curl', '-s', '-X', 'PATCH', '-H', f'X-Shopify-Access-Token: {TOKEN}',
                        '-H', 'Content-Type: application/json', '-d', json.dumps(data),
                        f'{API}/{path}'], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except:
        print(f"  PATCH parse error: {r.stdout[:200]}")
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

print("Fetching products...")
all_products = []
for page in range(1, 5):
        data = shopify_get(f"products.json?limit=25&page={page}")
    products = data.get("products", [])
    if not products: break
    all_products.extend(products)
    print(f"  Page {page}: {len(products)}")
    time.sleep(0.5)

shopify_by_title = {p['title']: p for p in all_products}
print(f"Total: {len(all_products)} products")

to_fix = []
for cj_title, cj_specs in cj_products.items():
    st = title_map.get(cj_title)
    if not st or st not in shopify_by_title:
        continue
    sp = shopify_by_title[st]
    existing = [v.get('option1','') for v in sp.get('variants',[]) if v.get('option1') and v['option1'] not in ('Default Title','Default','Option 1')]
    missing = [s for s in cj_specs if s not in existing]
    if missing:
        to_fix.append({'title': st, 'id': sp['id'], 'existing': existing, 'cj_specs': cj_specs, 'missing': missing, 'images': sp.get('images',[])})

print(f"\n{len(to_fix)} products need fixes:")
for item in to_fix:
    print(f"  {item['title'][:55]:55s} | Missing: {len(item['missing'])}")

total_created = 0
total_mapped = 0

for item in to_fix:
    pid = item['id']
    title = item['title']
    print(f"\n{'='*70}")
    print(f"Fixing: {title}")

    fresh = shopify_get(f"products/{pid}.json")
    product = fresh.get('product', {})

    existing_objs = []
    for v in product.get('variants', []):
        opt1 = v.get('option1') or v.get('title', 'Default Title')
        if opt1 in ('Default Title', 'Default', 'Option 1'): continue
        existing_objs.append({"id": v['id'], "option1": opt1, "price": str(v.get('price', '14.99'))})

    existing_set = set(v['option1'] for v in existing_objs)
    new_variants = [{"option1": s, "price": "14.99"} for s in item['missing'] if s not in existing_set]
    all_variants = existing_objs + new_variants
    all_specs = [v['option1'] for v in all_variants]

    print(f"  {len(existing_objs)} existing + {len(new_variants)} new = {len(all_variants)} total")

    result = shopify_put(f"products/{pid}.json", {
        "product": {"id": pid, "options": [{"name": "Variant", "values": all_specs}], "variants": all_variants}
    })

    if not result:
        print(f"  ❌ Failed")
        continue

    total_created += len(new_variants)
    print(f"  ✅ Updated — {len(result.get('product',{}).get('variants',[]))} variants")

    # Map images
    product_images = [img for img in item['images'] if img.get('alt','') != 'AI Generated Lifestyle Image']
    image_ids = [img['id'] for img in product_images]

    if image_ids:
        time.sleep(0.5)
        fresh2 = shopify_get(f"products/{pid}.json")
        fv = fresh2.get('product',{}).get('variants',[])
        vmap = {v.get('option1',''): v for v in fv if v.get('option1') and v['option1'] not in ('Default Title','Default','Option 1')}

        assigned = 0
        for i, spec in enumerate(all_specs):
            if i >= len(image_ids): break
            if spec in vmap:
                vid = vmap[spec]['id']
                if vmap[spec].get('image_id') == image_ids[i]: continue
                r = shopify_patch(f"variants/{vid}.json", {"variant": {"id": vid, "image_id": image_ids[i]}})
                if r: assigned += 1
                time.sleep(0.4)
        print(f"  📷 Mapped {assigned}/{min(len(all_specs),len(image_ids))} images")
        total_mapped += assigned

    time.sleep(0.8)

print(f"\n{'='*70}")
print(f"DONE: {len(to_fix)} products, {total_created} variants, {total_mapped} images")

# Refresh cache
subprocess.run(['curl', '-s', '-H', f'Authorization: Bearer {SITE_AUTH}',
                'https://drivekit-production.up.railway.app/api/shopify/cache/refresh'],
               capture_output=True)
print("Cache refreshed!")
