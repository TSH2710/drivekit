#!/usr/bin/env python3
"""
Assign variant images to Shopify products.
For products with multiple variants, maps gallery images to variants in order.
"""
import json, os, sys, time, requests

SHOPIFY_STORE = "dc5byu-fy.myshopify.com"
SHOPIFY_API = f"https://{SHOPIFY_STORE}/admin/api/2024-10"

TOKEN_FILE = "/tmp/shopify_token.txt"
TOKEN = "SHOPIFY_TOKEN_REMOVED"

HEADERS = {"X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json"}


def get_products():
    """Get products from the server cache."""
    resp = requests.get("https://drivekit-production.up.railway.app/api/shopify/products", timeout=15)
    data = resp.json()
    return data.get("products", [])


def get_raw_product(product_id):
    """Get raw Shopify product with image_id on variants."""
    resp = requests.get(f"{SHOPIFY_API}/products/{product_id}.json", headers=HEADERS, timeout=30)
    if not resp.ok:
        return None
    return resp.json().get("product", {})


def update_variant_image(product_id, variant_id, image_id):
    """Set image_id on a variant."""
    url = f"{SHOPIFY_API}/products/{product_id}.json"
    body = {"product": {"id": product_id, "variants": [{"id": variant_id, "image_id": image_id}]}}
    resp = requests.put(url, headers=HEADERS, json=body, timeout=30)
    if resp.status_code == 429:
        retry = int(resp.headers.get("Retry-After", 5))
        print(f"  Rate limited, waiting {retry}s...")
        time.sleep(retry)
        return update_variant_image(product_id, variant_id, image_id)
    return resp


def main():
    dry_run = "--dry-run" in sys.argv
    
    products = get_products()
    multi_variant_products = [
        p for p in products
        if len(p.get("variants", [])) > 1
        and len(p.get("images", [])) > 2
    ]
    
    print(f"Products with multiple variants and no image mapping: {len(multi_variant_products)}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print()
    
    updated = 0
    skipped = 0
    errors = 0
    
    for p in multi_variant_products:
        product_id = p["id"]
        title = p["title"]
        variants = p["variants"]
        images = p["images"]
        options = p.get("options", [])
        
        # Get the raw product to see actual image IDs and variant image IDs
        raw = get_raw_product(product_id)
        if not raw:
            print(f"❌ {title} — could not fetch raw product")
            errors += 1
            continue
        
        raw_variants = raw.get("variants", [])
        raw_images = raw.get("images", [])
        
        # Find variants that already have distinct image_ids set
        image_ids = set(v.get("image_id") for v in raw_variants if v.get("image_id"))
        all_distinct = len(image_ids) >= len(raw_variants)
        if all_distinct:
            print(f"⏭️  {title} — all {len(raw_variants)} variants already mapped")
            skipped += 1
            continue
        
        # Strategy: For variants without image_id, try to assign images in order
        # Skip the first 2 images (cover + product shot), assign the rest to variants
        # If there are more variants than remaining images, try to match by option name
        
        # Build a list of images that can be assigned (skip cover images)
        available_images = [img for img in raw_images if img.get("position", 0) > 2]
        
        # If not enough, include position 2 image too
        if len(available_images) < len(raw_variants):
            available_images = [img for img in raw_images if img.get("position", 0) > 1]
        
        # Try to match by option name in image alt text or filename
        unmapped_variants = [v for v in raw_variants if not v.get("image_id")]
        
        assignments = []
        used_image_ids = set(v.get("image_id") for v in raw_variants if v.get("image_id"))
        
        for v in unmapped_variants:
            variant_title = v.get("title", "").lower()
            option1 = (v.get("option1") or "").lower()
            option2 = (v.get("option2") or "").lower()
            
            # Try to find an image whose alt or filename matches the variant
            best_match = None
            for img in available_images:
                img_id = img.get("id")
                if img_id in used_image_ids:
                    continue
                img_alt = (img.get("alt") or "").lower()
                img_src = (img.get("src") or "").lower()
                
                # Check if option name appears in alt text or filename
                if option1 and len(option1) > 2:
                    if option1 in img_alt or option1 in img_src:
                        best_match = img
                        break
                if variant_title and len(variant_title) > 2:
                    if variant_title in img_alt or variant_title in img_src:
                        best_match = img
                        break
            
            if best_match:
                assignments.append((v, best_match))
                used_image_ids.add(best_match.get("id"))
        
        # For remaining unmatched variants, assign in order
        if len(assignments) < len(unmapped_variants):
            assigned_variant_ids = {a[0]["id"] for a in assignments}
            remaining_variants = [v for v in unmapped_variants if v["id"] not in assigned_variant_ids]
            
            for v in remaining_variants:
                for img in available_images:
                    img_id = img.get("id")
                    if img_id not in used_image_ids:
                        assignments.append((v, img))
                        used_image_ids.add(img_id)
                        break
        
        if not assignments:
            print(f"⏭️  {title} — no images available to assign")
            skipped += 1
            continue
        
        print(f"📦 {title} ({len(assignments)} variants to map)")
        for v, img in assignments:
            v_title = v.get("title", "?")
            img_pos = img.get("position", "?")
            img_id = img.get("id", "?")
            print(f"  {v_title} → image #{img_pos} (id={img_id})")
        
        if dry_run:
            skipped += 1
            continue
        
        # Apply assignments one variant at a time via /variants/{id}.json
        for v, img in assignments:
            body = {"variant": {"id": v["id"], "image_id": img["id"]}}
            resp = requests.put(f"{SHOPIFY_API}/variants/{v['id']}.json", headers=HEADERS, json=body, timeout=30)
            if resp.status_code == 429:
                retry = int(resp.headers.get("Retry-After", 5))
                print(f"  Rate limited, waiting {retry}s...")
                time.sleep(retry)
                resp = requests.put(f"{SHOPIFY_API}/variants/{v['id']}.json", headers=HEADERS, json=body, timeout=30)
            if resp.ok:
                print(f"  ✅ Set {v['title']} → image {img['id']}")
                updated += 1
            else:
                print(f"  ❌ Failed {v['title']}: {resp.status_code} {resp.text[:150]}")
                errors += 1
            time.sleep(0.6)

        print()
    
    print(f"{'='*60}")
    print(f"Results:")
    print(f"  Updated: {updated}")
    print(f"  Skipped: {skipped}")
    print(f"  Errors: {errors}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
