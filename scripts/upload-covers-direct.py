#!/usr/bin/env python3
"""
Upload Google Drive cover images directly to Shopify using multipart file upload.
Downloads each image from Google Drive, then uploads to Shopify.
"""
import json, os, sys, time, requests

SHOPIFY_STORE = "dc5byu-fy.myshopify.com"
SHOPIFY_API = f"https://{SHOPIFY_STORE}/admin/api/2024-10"

# Get token from the server's token cache
TOKEN = "SHOPIFY_TOKEN_REMOVED"
if not TOKEN:
    print("ERROR: No Shopify token found")
    sys.exit(1)

HEADERS = {"X-Shopify-Access-Token": TOKEN}

print(f"Token: {TOKEN[:10]}...")

# Mapping: drive product number -> {shopify_product_id, title, drive_file_id}
MAPPING = {
    "product-000": {"id": "15086313242990", "title": "Mirror Dash Cam 1080P Full HD", "drive_id": "1TL3BORyD10SPGEWZuQ2Ee8ROyoCwu_yp"},
    "product-001": {"id": "15089798611310", "title": "Small Eye Wifi Dash Cam Recorder", "drive_id": "1BUwBXsAf1BDDXrRYUd-6KhjpPtKmh_He"},
    "product-002": {"id": "15089798807918", "title": "3-in-1 Car Heater Defogger Fan", "drive_id": "1mprVJ9-4mVPkcfAqr7hEX3ZYphOowNxh"},
    "product-003": {"id": "15086312063342", "title": "360 Rearview Mirror Phone Mount", "drive_id": "13DkTc_IFSbSAdTgDBDMs3_-aNW03RpY5"},
    "product-004": {"id": "15086312161646", "title": "5000Pa Handheld Car Vacuum", "drive_id": "1iEdbFTsloVaVimBbpO4xWAK9Oz1pYXAL"},
    "product-005": {"id": "15089797595502", "title": "7-Inch Wireless CarPlay Display", "drive_id": "1beGwnnmZ8beUFUcInuajJIW2VAQiXVc1"},
    "product-008": {"id": "15089798349166", "title": "Mini Anti-Lost GPS Tracker Alarm", "drive_id": "1iCpioAJ11qEhIAd53F0Wf6EjXF6Bq8IK"},
    "product-009": {"id": "15089798938990", "title": "AutoClean Wireless Mini Vacuum", "drive_id": "1e8bPRf-YGvK5my3ZZRpfbjPpEtZzpxld"},
    "product-011": {"id": "15089799266670", "title": "Headlight Restoration Repair Liquid", "drive_id": "1yUn4mRVqmy1hSeqZtf8j6_98VtAO6xAE"},
    "product-013": {"id": "15089798513006", "title": "Car Armrest Box Cushion Pad", "drive_id": "1nsj2y_XsgXCd-BCE83ooH_8mSMu6CzJb"},
    "product-015": {"id": "15086312849774", "title": "Car Aromatherapy Diffuser & Purifier", "drive_id": "1Pde1jVvlvAiWs304L0Iefs7GwJ6tK5RD"},
    "product-016": {"id": "15089799364974", "title": "Cloud Mist Car Aroma Diffuser", "drive_id": "1SLtwyNwlgEQN2D9-pyL3yD8a-Hv_1Je6"},
    "product-017": {"id": "15089799168366", "title": "Car Bluetooth FM Transmitter MP3", "drive_id": "1aHy3WtaiZFRMvJ2OP8aRZ3EUUFU4f37e"},
    "product-018": {"id": "15089799233902", "title": "Carbon Fiber Bumper Guard Strips", "drive_id": "1kGUcT0cJoMLuqAmZ4gLZcNmOBQeJzndQ"},
    "product-019": {"id": "15089798873454", "title": "Extendable Snow Brush Ice Scraper", "drive_id": "1CCIZ-pzs67Qt7jXN4yJa9khFxCxqztMR"},
    "product-020": {"id": "15089798250862", "title": "Car Seat Neck Support Pillow", "drive_id": "1aGH_Y9j0eNlgbleNmg1l9k7W2Q0-tGCS"},
    "product-021": {"id": "15089797726574", "title": "12V Car Seat Heating Cushion", "drive_id": "1Ch7fhndB1hbCt-DU-hp6qRgTIMFvE6mB"},
    "product-022": {"id": "15089797955950", "title": "Mini Car Humidifier & Air Purifier", "drive_id": "1XnT86keq4P6gBGeFkjzmScc42GwpJk_O"},
    "product-023": {"id": "15089797824878", "title": "Car LED Ambient Light Strip", "drive_id": "1q8J8oY_sO04VNqrfEcNrEQynZnRVC-wV"},
    "product-024": {"id": "15089797890414", "title": "LED Daytime Running Light Bar", "drive_id": "1zObAHGdU1wUHu9OaptUfjs_CIXNWHvxf"},
    "product-025": {"id": "15089798021486", "title": "LED Turn Signal Light Strip", "drive_id": "1G7HTEjs-EwbrZfN9TwkUoHttLvBu5owp"},
    "product-026": {"id": "15089798644078", "title": "Cordless Car Polishing Machine", "drive_id": "1Y6_NdprhHmA2RN51CLOv0OOnNCY6bKmy"},
    "product-027": {"id": "15089799430510", "title": "Smartphone Heads-Up Display Mount", "drive_id": "1inilY6x7otPhVcA-ZYqveOGLhru_sZz1"},
    "product-028": {"id": "15089797759342", "title": "Car Scratch Remover Repair Kit", "drive_id": "1AT0covEij0jh3HMyvnjwJAJdOMQ_rww9"},
    "product-029": {"id": "15089798119790", "title": "Magnetic Windshield Snow Cover", "drive_id": "1R8ygcyae9vOm8RiDxV6fDj9N6rZtrfra"},
    "product-030": {"id": "15089798742382", "title": "Car Seat Back Storage Pocket", "drive_id": "1Kkpz_6b61ttmmDvAenDfnkdeNer8iZfI"},
    "product-031": {"id": "15089798054254", "title": "Car Seat Storage Organizer Bag", "drive_id": "14JER02pBxKCYsSzlQqd1WsK0EiH1C3YV"},
    "product-032": {"id": "15089797988718", "title": "Car Wash Cleaning Gloves", "drive_id": "1cYAYWYDIcMSSJ8Rc0WDw4SFyB4a6ZifM"},
    "product-034": {"id": "15086311965038", "title": "RGB LED Cup Holder Coaster Light", "drive_id": "1blnFYexsUqwirYIRcO5LKZ_3sLCFmZJ4"},
    "product-035": {"id": "15086313013614", "title": "Cordless Electric Ice Scraper", "drive_id": "16UE-WBQzNXJTgAdZbYbKw0BOIY_Ws6vm"},
    "product-036": {"id": "15086312391022", "title": "Cordless Car Vacuum Cleaner", "drive_id": "1TwE8uae5nUkQdC0GRqtDXgAIrQF8uYUx"},
    "product-037": {"id": "15086313177454", "title": "Microfiber Car Detailing Towels", "drive_id": "10a72hqhr9JrGKOE14iushp8mRYNlpaSj"},
    "product-038": {"id": "15089798709614", "title": "2-in-1 Foldable Car Cup Holder", "drive_id": "1Jax7qrzN4YXczUF4GtpsTbnylTyum-6R"},
    "product-041": {"id": "15089799037294", "title": "Motorcycle Helmet LED Signal Strip", "drive_id": "1CxgSJb8gC-zHiBS7dtmMQkFXnBrJ3pVC"},
    "product-042": {"id": "15089798087022", "title": "Wet & Dry Car Vacuum Cleaner", "drive_id": "1xZv4yyS3Aer-_EsZTi2TNhKvMZA30-cX"},
    "product-043": {"id": "15086312489326", "title": "High Pressure Foam Spray Gun", "drive_id": "1rdTs0f0mQ2_44q3Pu0aItoQBbWT7yU5I"},
    "product-044": {"id": "15086311866734", "title": "Premium Seatback Car Organizer", "drive_id": "1oaH8hi7_dncVhSL-mJKxdcbC0lvzAEW9"},
    "product-045": {"id": "15089797857646", "title": "Inflatable Car Travel Air Mattress", "drive_id": "15pRLPTjC5wEgD8-Zc6BGl_JijpuHy2bh"},
    "product-046": {"id": "15086312227182", "title": "Magnetic Mini GPS Car Tracker", "drive_id": "1m4dCr8mUPjFlKhRi1FNBMsvqSid6_9OF"},
    "product-047": {"id": "15089798676846", "title": "Magnetic Car Windshield Cover", "drive_id": "1R5PpSYkTQk5BVX4T0DCC03d6OAiKRfKG"},
    "product-048": {"id": "15086312915310", "title": "Car Seat Gap Felt Organizer", "drive_id": "1Z0ivk7qKYjYaxcgriDkcfE_vKwDlbqAS"},
    "product-049": {"id": "15089799102830", "title": "Backseat Folding Car Desk Tray", "drive_id": "1xyFhkswKKMBUAaes6Or8j7DyG3skcQ_3"},
    "product-050": {"id": "15089798545774", "title": "4-in-1 Non-Slip Phone Dash Mat", "drive_id": "1gqNIS7FZlZaTk2ngQryRKmBDdCS0wZhS"},
    "product-051": {"id": "15089798906222", "title": "ECO OBD2 Fuel Saver Chip", "drive_id": "1Y3DjjLM_f-rSLlFHG-Ydzx_JQZH_hViR"},
    "product-052": {"id": "15089798971758", "title": "Kinetic Solar Car Air Freshener", "drive_id": "1gYPSCVYXh9_S2d3ORzjL4u5JQIlF-Zsb"},
    "product-053": {"id": "15086313111918", "title": "Smart LED Digital Tire Inflator", "drive_id": "1ykPuGQIQha6EHHgArHsK0Xl4X4rpZW85"},
    "product-054": {"id": "15089799135598", "title": "Portable 12V Windshield Defroster", "drive_id": "1fD-0HLErZ44EIAiPb_cMHbV33IYtpYpP"},
    "product-055": {"id": "15086312685934", "title": "Mini Dual-Purpose Car Vacuum", "drive_id": "1KsUjg6lewjla2m0cw1o9KVH5WSC-Lkbv"},
    "product-056": {"id": "15086313341294", "title": "Rotating Multi-Angle Door Cup Holder", "drive_id": "13uSNYJAUGNW08oSfDkn7MNgPzEQJvT8j"},
    "product-057": {"id": "15089798611310", "title": "Small Eye Wifi Dash Cam Recorder", "drive_id": "19k4zRK--sm8WgBw2gObW23SkOi0WacRs"},
    "product-059": {"id": "15089799332206", "title": "Emergency Snow Tire Chains", "drive_id": "1O228rwjAp28XLmBxIz2-JyUP2yfaE1FH"},
    "product-060": {"id": "15089798283630", "title": "Solar Rotating Car Air Freshener", "drive_id": "1-xiZ0Q0v9KzMvNm--pa4ZsJdVqsogrs1"},
    "product-061": {"id": "15089797923182", "title": "Steering Wheel Tray Table", "drive_id": "1s3kFIc_yWnLE44g4PvNDPFaoolsi9eTb"},
    "product-062": {"id": "15086311801198", "title": "Telescopic Dashboard Phone Mount", "drive_id": "1xoHTo_KSeutP06rtZ_iBZnuuniW6DN0t"},
    "product-sun-shade": {"id": "15086313439598", "title": "Foldable Windshield Sun Shade", "drive_id": "1IhE9DFVrH7spqy2aq79m08QRtjCJWEXr"},
}

DRIVE_DIR = "/app/workspace/drive_covers/generated-products"


def download_from_gdrive(file_id):
    """Download a file from Google Drive by its ID."""
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.content


def upload_to_shopify(product_id, image_data, filename):
    """Upload an image to a Shopify product using multipart file upload."""
    url = f"{SHOPIFY_API}/products/{product_id}/images.json"
    
    # Use requests' built-in file upload which handles multipart correctly
    files = {'image': (filename, image_data, 'image/png')}
    
    resp = requests.post(url, headers=HEADERS, files=files, timeout=60)
    if resp.status_code == 429:
        retry_after = int(resp.headers.get('Retry-After', 5))
        print(f"  Rate limited, waiting {retry_after}s...")
        time.sleep(retry_after)
        return upload_to_shopify(product_id, image_data, filename)
    
    return resp


def set_position(product_id, image_id, position=1):
    """Set the position of an image."""
    url = f"{SHOPIFY_API}/products/{product_id}/images/{image_id}.json"
    resp = requests.put(url, headers={**HEADERS, 'Content-Type': 'application/json'},
                       json={'image': {'id': image_id, 'position': position}}, timeout=30)
    return resp.ok


def main():
    dry_run = '--dry-run' in sys.argv
    
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"Store: {SHOPIFY_STORE}")
    print(f"Products to process: {len(MAPPING)}")
    print()
    
    results = {"uploaded": 0, "skipped": 0, "errors": 0, "details": []}
    
    for product_key, info in sorted(MAPPING.items()):
        product_id = info["id"]
        title = info["title"]
        drive_id = info["drive_id"]
        
        # Find local file
        matching_files = [f for f in os.listdir(DRIVE_DIR) if f.startswith(product_key)]
        if not matching_files:
            print(f"⏭️  {title} — no local file")
            results["skipped"] += 1
            continue
        
        filename = matching_files[0]
        filepath = os.path.join(DRIVE_DIR, filename)
        
        print(f"📦 {title} ({product_key})")
        
        if dry_run:
            print(f"   Would upload: {filename} ({os.path.getsize(filepath)} bytes)")
            results["skipped"] += 1
            continue
        
        try:
            # Read local file (already downloaded by gdown)
            with open(filepath, 'rb') as f:
                image_data = f.read()
            print(f"   Read {len(image_data)} bytes from {filename}")
            
            # Upload to Shopify
            resp = upload_to_shopify(product_id, image_data, filename)
            
            if resp.ok:
                result = resp.json()
                new_image = result.get('image', {})
                new_id = new_image.get('id')
                pos = new_image.get('position')
                
                # Ensure position is 1
                if pos != 1 and new_id:
                    set_position(product_id, new_id, 1)
                    pos = 1
                
                print(f"   ✅ Uploaded! ID={new_id}, position={pos}")
                results["uploaded"] += 1
                results["details"].append({"title": title, "action": "uploaded", "image_id": new_id})
            else:
                error_text = resp.text[:200]
                print(f"   ❌ Error: {resp.status_code} — {error_text}")
                results["errors"] += 1
                results["details"].append({"title": title, "action": "error", "error": f"{resp.status_code}: {error_text}"})
            
            time.sleep(0.6)
            
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


if __name__ == "__main__":
    main()
