#!/usr/bin/env python3
"""
Upload Google Drive cover images to Shopify products.
Downloads each image from Google Drive, uploads to Shopify, and sets as cover (position 1).
"""
import json, os, sys, time, requests

# Config
SHOPIFY_API = os.environ.get("SHOPIFY_API", "https://dc5byu-fy.myshopify.com/admin/api/2024-10")
SHOPIFY_TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
CACHE_FILE = "/app/workspace/.shopify-cache/products.json"
DRIVE_DIR = "/app/workspace/drive_covers/generated-products"

if not SHOPIFY_TOKEN:
    # Try reading from token cache
    token_cache = "/app/workspace/.shopify-cache/token-cache.json"
    if os.path.exists(token_cache):
        with open(token_cache) as f:
            data = json.load(f)
            SHOPIFY_TOKEN = data.get("accessToken", "")
    if not SHOPIFY_TOKEN:
        print("ERROR: No Shopify access token found")
        sys.exit(1)

HEADERS = {
    "X-Shopify-Access-Token": SHOPIFY_TOKEN,
    "Content-Type": "application/json",
}

# Mapping: product_number -> shopify_product_id
# Based on the mapping script output
MAPPING = {
    "product-000": {"id": "15086313242990", "title": "Mirror Dash Cam 1080P Full HD"},
    "product-001": {"id": "15089798611310", "title": "Small Eye Wifi Dash Cam Recorder"},
    "product-002": {"id": "15089798807918", "title": "3-in-1 Car Heater Defogger Fan"},
    "product-003": {"id": "15086312063342", "title": "360 Rearview Mirror Phone Mount"},
    "product-004": {"id": "15086312161646", "title": "5000Pa Handheld Car Vacuum"},
    "product-005": {"id": "15089797595502", "title": "7-Inch Wireless CarPlay Display"},
    "product-008": {"id": "15089798349166", "title": "Mini Anti-Lost GPS Tracker Alarm"},
    "product-009": {"id": "15089798938990", "title": "AutoClean Wireless Mini Vacuum"},
    "product-011": {"id": "15089799266670", "title": "Headlight Restoration Repair Liquid"},
    "product-013": {"id": "15089798513006", "title": "Car Armrest Box Cushion Pad"},
    "product-015": {"id": "15086312849774", "title": "Car Aromatherapy Diffuser & Purifier"},
    "product-016": {"id": "15089799364974", "title": "Cloud Mist Car Aroma Diffuser"},
    "product-017": {"id": "15089799168366", "title": "Car Bluetooth FM Transmitter MP3"},
    "product-018": {"id": "15089799233902", "title": "Carbon Fiber Bumper Guard Strips"},
    "product-019": {"id": "15089798873454", "title": "Extendable Snow Brush Ice Scraper"},
    "product-020": {"id": "15089798250862", "title": "Car Seat Neck Support Pillow"},
    "product-021": {"id": "15089797726574", "title": "12V Car Seat Heating Cushion"},
    "product-022": {"id": "15089797955950", "title": "Mini Car Humidifier & Air Purifier"},
    "product-023": {"id": "15089797824878", "title": "Car LED Ambient Light Strip"},
    "product-024": {"id": "15089797890414", "title": "LED Daytime Running Light Bar"},
    "product-025": {"id": "15089798021486", "title": "LED Turn Signal Light Strip"},
    "product-026": {"id": "15089798644078", "title": "Cordless Car Polishing Machine"},
    "product-027": {"id": "15089799430510", "title": "Smartphone Heads-Up Display Mount"},
    "product-028": {"id": "15089797759342", "title": "Car Scratch Remover Repair Kit"},
    "product-029": {"id": "15089798119790", "title": "Magnetic Windshield Snow Cover"},
    "product-030": {"id": "15089798742382", "title": "Car Seat Back Storage Pocket"},
    "product-031": {"id": "15089798054254", "title": "Car Seat Storage Organizer Bag"},
    "product-032": {"id": "15089797988718", "title": "Car Wash Cleaning Gloves"},
    "product-034": {"id": "15086311965038", "title": "RGB LED Cup Holder Coaster Light"},
    "product-035": {"id": "15086313013614", "title": "Cordless Electric Ice Scraper"},
    "product-036": {"id": "15086312391022", "title": "Cordless Car Vacuum Cleaner"},
    "product-037": {"id": "15086313177454", "title": "Microfiber Car Detailing Towels"},
    "product-038": {"id": "15089798709614", "title": "2-in-1 Foldable Car Cup Holder"},
    "product-041": {"id": "15089799037294", "title": "Motorcycle Helmet LED Signal Strip"},
    "product-042": {"id": "15089798087022", "title": "Wet & Dry Car Vacuum Cleaner"},
    "product-043": {"id": "15086312489326", "title": "High Pressure Foam Spray Gun"},
    "product-044": {"id": "15086311866734", "title": "Premium Seatback Car Organizer"},
    "product-045": {"id": "15089797857646", "title": "Inflatable Car Travel Air Mattress"},
    "product-046": {"id": "15086312227182", "title": "Magnetic Mini GPS Car Tracker"},
    "product-047": {"id": "15089798676846", "title": "Magnetic Car Windshield Cover"},
    "product-048": {"id": "15086312915310", "title": "Car Seat Gap Felt Organizer"},
    "product-049": {"id": "15089799102830", "title": "Backseat Folding Car Desk Tray"},
    "product-050": {"id": "15089798545774", "title": "4-in-1 Non-Slip Phone Dash Mat"},
    "product-051": {"id": "15089798906222", "title": "ECO OBD2 Fuel Saver Chip"},
    "product-052": {"id": "15089798971758", "title": "Kinetic Solar Car Air Freshener"},
    "product-053": {"id": "15086313111918", "title": "Smart LED Digital Tire Inflator"},
    "product-054": {"id": "15089799135598", "title": "Portable 12V Windshield Defroster"},
    "product-055": {"id": "15086312685934", "title": "Mini Dual-Purpose Car Vacuum"},
    "product-056": {"id": "15086313341294", "title": "Rotating Multi-Angle Door Cup Holder"},
    "product-057": {"id": "15089798611310", "title": "Small Eye Wifi Dash Cam Recorder"},
    "product-059": {"id": "15089799332206", "title": "Emergency Snow Tire Chains"},
    "product-060": {"id": "15089798283630", "title": "Solar Rotating Car Air Freshener"},
    "product-061": {"id": "15089797923182", "title": "Steering Wheel Tray Table"},
    "product-062": {"id": "15086311801198", "title": "Telescopic Dashboard Phone Mount"},
    "product-sun-shade": {"id": "15086313439598", "title": "Foldable Windshield Sun Shade"},
}

# Google Drive file IDs (from gdown output)
DRIVE_FILE_IDS = {
    "product-000": "1TL3BORyD10SPGEWZuQ2Ee8ROyoCwu_yp",
    "product-001": "1BUwBXsAf1BDDXrRYUd-6KhjpPtKmh_He",
    "product-002": "1mprVJ9-4mVPkcfAqr7hEX3ZYphOowNxh",
    "product-003": "13DkTc_IFSbSAdTgDBDMs3_-aNW03RpY5",
    "product-004": "1iEdbFTsloVaVimBbpO4xWAK9Oz1pYXAL",
    "product-005": "1beGwnnmZ8beUFUcInuajJIW2VAQiXVc1",
    "product-008": "1iCpioAJ11qEhIAd53F0Wf6EjXF6Bq8IK",
    "product-009": "1e8bPRf-YGvK5my3ZZRpfbjPpEtZzpxld",
    "product-011": "1yUn4mRVqmy1hSeqZtf8j6_98VtAO6xAE",
    "product-013": "1nsj2y_XsgXCd-BCE83ooH_8mSMu6CzJb",
    "product-015": "1Pde1jVvlvAiWs304L0Iefs7GwJ6tK5RD",
    "product-016": "1SLtwyNwlgEQN2D9-pyL3yD8a-Hv_1Je6",
    "product-017": "1aHy3WtaiZFRMvJ2OP8aRZ3EUUFU4f37e",
    "product-018": "1kGUcT0cJoMLuqAmZ4gLZcNmOBQeJzndQ",
    "product-019": "1CCIZ-pzs67Qt7jXN4yJa9khFxCxqztMR",
    "product-020": "1aGH_Y9j0eNlgbleNmg1l9k7W2Q0-tGCS",
    "product-021": "1Ch7fhndB1hbCt-DU-hp6qRgTIMFvE6mB",
    "product-022": "1XnT86keq4P6gBGeFkjzmScc42GwpJk_O",
    "product-023": "1q8J8oY_sO04VNqrfEcNrEQynZnRVC-wV",
    "product-024": "1zObAHGdU1wUHu9OaptUfjs_CIXNWHvxf",
    "product-025": "1G7HTEjs-EwbrZfN9TwkUoHttLvBu5owp",
    "product-026": "1Y6_NdprhHmA2RN51CLOv0OOnNCY6bKmy",
    "product-027": "1inilY6x7otPhVcA-ZYqveOGLhru_sZz1",
    "product-028": "1AT0covEij0jh3HMyvnjwJAJdOMQ_rww9",
    "product-029": "1R8ygcyae9vOm8RiDxV6fDj9N6rZtrfra",
    "product-030": "1Kkpz_6b61ttmmDvAenDfnkdeNer8iZfI",
    "product-031": "14JER02pBxKCYsSzlQqd1WsK0EiH1C3YV",
    "product-032": "1cYAYWYDIcMSSJ8Rc0WDw4SFyB4a6ZifM",
    "product-034": "1blnFYexsUqwirYIRcO5LKZ_3sLCFmZJ4",
    "product-035": "16UE-WBQzNXJTgAdZbYbKw0BOIY_Ws6vm",
    "product-036": "1TwE8uae5nUkQdC0GRqtDXgAIrQF8uYUx",
    "product-037": "10a72hqhr9JrGKOE14iushp8mRYNlpaSj",
    "product-038": "1Jax7qrzN4YXczUF4GtpsTbnylTyum-6R",
    "product-041": "1CxgSJb8gC-zHiBS7dtmMQkFXnBrJ3pVC",
    "product-042": "1xZv4yyS3Aer-_EsZTi2TNhKvMZA30-cX",
    "product-043": "1rdTs0f0mQ2_44q3Pu0aItoQBbWT7yU5I",
    "product-044": "1oaH8hi7_dncVhSL-mJKxdcbC0lvzAEW9",
    "product-045": "15pRLPTjC5wEgD8-Zc6BGl_JijpuHy2bh",
    "product-046": "1m4dCr8mUPjFlKhRi1FNBMsvqSid6_9OF",
    "product-047": "1R5PpSYkTQk5BVX4T0DCC03d6OAiKRfKG",
    "product-048": "1Z0ivk7qKYjYaxcgriDkcfE_vKwDlbqAS",
    "product-049": "1xyFhkswKKMBUAaes6Or8j7DyG3skcQ_3",
    "product-050": "1gqNIS7FZlZaTk2ngQryRKmBDdCS0wZhS",
    "product-051": "1Y3DjjLM_f-rSLlFHG-Ydzx_JQZH_hViR",
    "product-052": "1gYPSCVYXh9_S2d3ORzjL4u5JQIlF-Zsb",
    "product-053": "1ykPuGQIQha6EHHgArHsK0Xl4X4rpZW85",
    "product-054": "1fD-0HLErZ44EIAiPb_cMHbV33IYtpYpP",
    "product-055": "1KsUjg6lewjla2m0cw1o9KVH5WSC-Lkbv",
    "product-056": "13uSNYJAUGNW08oSfDkn7MNgPzEQJvT8j",
    "product-057": "19k4zRK--sm8WgBw2gObW23SkOi0WacRs",
    "product-059": "1O228rwjAp28XLmBxIz2-JyUP2yfaE1FH",
    "product-060": "1-xiZ0Q0v9KzMvNm--pa4ZsJdVqsogrs1",
    "product-061": "1s3kFIc_yWnLE44g4PvNDPFaoolsi9eTb",
    "product-062": "1xoHTo_KSeutP06rtZ_iBZnuuniW6DN0t",
    "product-sun-shade": "1IhE9DFVrH7spqy2aq79m08QRtjCJWEXr",
}


def download_from_gdrive(file_id: str) -> bytes:
    """Download a file from Google Drive by its ID."""
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.content


def upload_image_to_shopify(product_id: str, image_data: bytes, filename: str, position: int = 1) -> dict:
    """Upload an image to a Shopify product and set its position."""
    url = f"{SHOPIFY_API}/products/{product_id}/images.json"
    
    # Upload as multipart form data
    files = {
        'image': (filename, image_data, 'image/png'),
    }
    data = {
        'image': json.dumps({
            'filename': filename,
            'position': position,
        })
    }
    
    headers = {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
    }
    
    resp = requests.post(url, headers=headers, files=files, data=data, timeout=60)
    if resp.status_code == 429:
        retry_after = int(resp.headers.get('Retry-After', 5))
        print(f"  Rate limited, waiting {retry_after}s...")
        time.sleep(retry_after)
        return upload_image_to_shopify(product_id, image_data, filename, position)
    
    resp.raise_for_status()
    return resp.json()


def delete_image(product_id: str, image_id: str) -> bool:
    """Delete a specific image from a Shopify product."""
    url = f"{SHOPIFY_API}/products/{product_id}/images/{image_id}.json"
    headers = {"X-Shopify-Access-Token": SHOPIFY_TOKEN}
    resp = requests.delete(url, headers=headers, timeout=30)
    return resp.ok


def get_product_images(product_id: str) -> list:
    """Get all images for a product."""
    url = f"{SHOPIFY_API}/products/{product_id}/images.json"
    headers = {"X-Shopify-Access-Token": SHOPIFY_TOKEN}
    resp = requests.get(url, headers=headers, timeout=30)
    if not resp.ok:
        return []
    return resp.json().get('images', [])


def main():
    # Parse command line args
    dry_run = '--dry-run' in sys.argv
    skip_upload = '--skip-upload' in sys.argv
    delete_old = '--delete-old' in sys.argv
    
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"Skip upload: {skip_upload}")
    print(f"Delete old covers: {delete_old}")
    print(f"Products to process: {len(MAPPING)}")
    print()
    
    results = {"uploaded": 0, "skipped": 0, "errors": 0, "details": []}
    
    for product_key, product_info in sorted(MAPPING.items()):
        product_id = product_info["id"]
        title = product_info["title"]
        
        # Find the drive file
        matching_files = [f for f in os.listdir(DRIVE_DIR) if f.startswith(product_key)]
        if not matching_files:
            print(f"⏭️  {title} — no drive file found for {product_key}")
            results["skipped"] += 1
            continue
        
        filename = matching_files[0]
        filepath = os.path.join(DRIVE_DIR, filename)
        
        print(f"📦 {title} ({product_key})")
        
        if dry_run:
            print(f"   Would upload: {filename}")
            results["skipped"] += 1
            continue
        
        try:
            # Get current images to check if already has this cover
            current_images = get_product_images(product_id)
            current_filenames = [img.get('src', '').split('/')[-1].split('?')[0] for img in current_images]
            
            if filename in current_filenames:
                print(f"   ⏭️  Already has this cover")
                results["skipped"] += 1
                results["details"].append({"title": title, "action": "already_has_cover"})
                continue
            
            # Download from Google Drive
            if not skip_upload:
                print(f"   Downloading from Google Drive...")
                drive_file_id = DRIVE_FILE_IDS.get(product_key)
                if not drive_file_id:
                    print(f"   ❌ No Drive file ID for {product_key}")
                    results["errors"] += 1
                    continue
                
                image_data = download_from_gdrive(drive_file_id)
                print(f"   Downloaded {len(image_data)} bytes")
                
                # Upload to Shopify
                print(f"   Uploading to Shopify...")
                result = upload_image_to_shopify(product_id, image_data, filename, position=1)
                new_image = result.get('image', {})
                new_image_id = new_image.get('id')
                print(f"   ✅ Uploaded! Image ID: {new_image_id}, position: {new_image.get('position')}")
                
                # Delete old cover images (position > 1 that are not lifestyle)
                if delete_old and current_images:
                    for img in current_images:
                        img_src = img.get('src', '')
                        if 'lifestyle' not in img_src.lower() and img.get('position', 0) > 1:
                            # Don't delete, just note it
                            pass
                
                results["uploaded"] += 1
                results["details"].append({"title": title, "action": "uploaded", "image_id": new_image_id})
                
                time.sleep(0.6)  # Rate limit
            else:
                print(f"   Skipping upload (skip-upload mode)")
                results["skipped"] += 1
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
            results["errors"] += 1
            results["details"].append({"title": title, "action": "error", "error": str(e)})
    
    print(f"\n{'='*60}")
    print(f"Results:")
    print(f"  Uploaded: {results['uploaded']}")
    print(f"  Skipped: {results['skipped']}")
    print(f"  Errors: {results['errors']}")
    print(f"{'='*60}")
    
    return results


if __name__ == "__main__":
    main()
