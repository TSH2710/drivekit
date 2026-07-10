#!/usr/bin/env python3
"""
Sync Shopify product tags:
1. Remove "All-Season" tag from all products
2. Assign proper batch tags: Batch 1 (30), Batch 2 (30), Batch 3 (1)
3. Only keep compareAtPrice on products tagged "Summer"
"""
import json
import urllib.request
import os
import time

STORE = "dc5byu-fy.myshopify.com"
TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
API_VERSION = "2024-10"
BASE = f"https://{STORE}/admin/api/{API_VERSION}"

HEADERS = {
    "X-Shopify-Access-Token": TOKEN,
    "Content-Type": "application/json",
}

def api_get(path):
    req = urllib.request.Request(f"{BASE}{path}", headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def api_put(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=HEADERS, method="PUT")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# Fetch all products
print("Fetching all products...")
all_products = []
page = 1
while True:
    resp = api_get(f"/products.json?limit=250&page={page}")
    products = resp.get("products", [])
    if not products:
        break
    all_products.extend(products)
    page += 1

print(f"Found {len(all_products)} products\n")

# Sort products by ID for consistent batch assignment
all_products.sort(key=lambda p: p["id"])

# Assign batches: first 30 → Batch 1, next 30 → Batch 2, last 1 → Batch 3
batch_assignments = {}
for i, p in enumerate(all_products):
    if i < 30:
        batch_assignments[p["id"]] = "Batch 1"
    elif i < 60:
        batch_assignments[p["id"]] = "Batch 2"
    else:
        batch_assignments[p["id"]] = "Batch 3"

# Track stats
updated = 0
skipped = 0
errors = []

for p in all_products:
    pid = p["id"]
    title = p["title"]
    old_tags = set(p.get("tags", []))
    has_summer = "Summer" in old_tags
    
    # Build new tags: remove All-Season, add correct batch
    new_tags = set(old_tags)
    new_tags.discard("All-Season")
    new_tags.discard("Batch1")
    new_tags.discard("Batch2")
    new_tags.discard("Batch3")
    new_tags.discard("Batch 1")
    new_tags.discard("Batch 2")
    new_tags.discard("Batch 3")
    new_tags.add(batch_assignments[pid])
    
    # Build variants update: only keep compareAtPrice on Summer items
    variants = []
    for v in p.get("variants", []):
        variant_update = {"id": v["id"]}
        if not has_summer and v.get("compare_at_price"):
            variant_update["compare_at_price"] = None
            print(f"  Removing discount from: {title} ({v.get('title', 'Default')})")
        variants.append(variant_update)
    
    # Only update if something changed
    tags_changed = set(map(str.lower, new_tags)) != set(map(str.lower, old_tags))
    price_changed = any("compare_at_price" in v for v in variants)
    
    if not tags_changed and not price_changed:
        skipped += 1
        continue
    
    try:
        update_data = {
            "product": {
                "id": pid,
                "tags": ", ".join(sorted(new_tags)),
            }
        }
        if price_changed:
            update_data["product"]["variants"] = variants
        
        api_put(f"/products/{pid}.json", update_data)
        updated += 1
        
        batch = batch_assignments[pid]
        tag_str = ", ".join(sorted(new_tags))
        print(f"✅ [{batch}] {title} → tags: {tag_str}")
        
        time.sleep(0.5)  # Rate limit
    except Exception as e:
        errors.append(f"{title}: {e}")
        print(f"❌ {title}: {e}")

print(f"\n{'='*50}")
print(f"Results: {updated} updated, {skipped} unchanged, {len(errors)} errors")
if errors:
    print("\nErrors:")
    for e in errors:
        print(f"  - {e}")

# Print batch summary
print(f"\nBatch Summary:")
for batch_name in ["Batch 1", "Batch 2", "Batch 3"]:
    count = sum(1 for v in batch_assignments.values() if v == batch_name)
    print(f"  {batch_name}: {count} products")
