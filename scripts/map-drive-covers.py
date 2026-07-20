#!/usr/bin/env python3
"""Map Google Drive cover images to Shopify products and output JSON for the upload endpoint."""
import json, os, re

# Drive images (downloaded)
DRIVE_DIR = "/app/workspace/drive_covers/generated-products"
drive_files = sorted(os.listdir(DRIVE_DIR))

# Shopify products (from API)
SHOPIFY_PRODUCTS = [
    {"id": "15089797726574", "title": "12V Car Seat Heating Cushion"},
    {"id": "15089798709614", "title": "2-in-1 Foldable Car Cup Holder"},
    {"id": "15089798807918", "title": "3-in-1 Car Heater Defogger Fan"},
    {"id": "15086312063342", "title": "360 Rearview Mirror Phone Mount"},
    {"id": "15089798545774", "title": "4-in-1 Non-Slip Phone Dash Mat"},
    {"id": "15086312161646", "title": "5000Pa Handheld Car Vacuum"},
    {"id": "15089797595502", "title": "7-Inch Wireless CarPlay Display"},
    {"id": "15089798938990", "title": "AutoClean Wireless Mini Vacuum"},
    {"id": "15089799102830", "title": "Backseat Folding Car Desk Tray"},
    {"id": "15089798513006", "title": "Car Armrest Box Cushion Pad"},
    {"id": "15086312849774", "title": "Car Aromatherapy Diffuser & Purifier"},
    {"id": "15089799168366", "title": "Car Bluetooth FM Transmitter MP3"},
    {"id": "15089797824878", "title": "Car LED Ambient Light Strip"},
    {"id": "15089797759342", "title": "Car Scratch Remover Repair Kit"},
    {"id": "15089798742382", "title": "Car Seat Back Storage Pocket"},
    {"id": "15086312915310", "title": "Car Seat Gap Felt Organizer"},
    {"id": "15089798250862", "title": "Car Seat Neck Support Pillow"},
    {"id": "15089798054254", "title": "Car Seat Storage Organizer Bag"},
    {"id": "15089797988718", "title": "Car Wash Cleaning Gloves"},
    {"id": "15089799233902", "title": "Carbon Fiber Bumper Guard Strips"},
    {"id": "15089799364974", "title": "Cloud Mist Car Aroma Diffuser"},
    {"id": "15089798644078", "title": "Cordless Car Polishing Machine"},
    {"id": "15086312391022", "title": "Cordless Car Vacuum Cleaner"},
    {"id": "15086313013614", "title": "Cordless Electric Ice Scraper"},
    {"id": "15089798152558", "title": "Crystal Diamond Car Interior Decor"},
    {"id": "15089798906222", "title": "ECO OBD2 Fuel Saver Chip"},
    {"id": "15089799332206", "title": "Emergency Snow Tire Chains"},
    {"id": "15089798873454", "title": "Extendable Snow Brush Ice Scraper"},
    {"id": "15086313439598", "title": "Foldable Windshield Sun Shade"},
    {"id": "15089799266670", "title": "Headlight Restoration Repair Liquid"},
    {"id": "15086312489326", "title": "High Pressure Foam Spray Gun"},
    {"id": "15089797857646", "title": "Inflatable Car Travel Air Mattress"},
    {"id": "15089798971758", "title": "Kinetic Solar Car Air Freshener"},
    {"id": "15089797890414", "title": "LED Daytime Running Light Bar"},
    {"id": "15089798021486", "title": "LED Turn Signal Light Strip"},
    {"id": "15089798480238", "title": "Leather Car Seat Back Organizer"},
    {"id": "15089798676846", "title": "Magnetic Car Windshield Cover"},
    {"id": "15086312227182", "title": "Magnetic Mini GPS Car Tracker"},
    {"id": "15089798119790", "title": "Magnetic Windshield Snow Cover"},
    {"id": "15086313177454", "title": "Microfiber Car Detailing Towels"},
    {"id": "15089798349166", "title": "Mini Anti-Lost GPS Tracker Alarm"},
    {"id": "15089797955950", "title": "Mini Car Humidifier & Air Purifier"},
    {"id": "15086312685934", "title": "Mini Dual-Purpose Car Vacuum"},
    {"id": "15086313242990", "title": "Mirror Dash Cam 1080P Full HD"},
    {"id": "15089799037294", "title": "Motorcycle Helmet LED Signal Strip"},
    {"id": "15089799135598", "title": "Portable 12V Windshield Defroster"},
    {"id": "15086311866734", "title": "Premium Seatback Car Organizer"},
    {"id": "15086311965038", "title": "RGB LED Cup Holder Coaster Light"},
    {"id": "15086313341294", "title": "Rotating Multi-Angle Door Cup Holder"},
    {"id": "15089798611310", "title": "Small Eye Wifi Dash Cam Recorder"},
    {"id": "15086313111918", "title": "Smart LED Digital Tire Inflator"},
    {"id": "15089799430510", "title": "Smartphone Heads-Up Display Mount"},
    {"id": "15089798283630", "title": "Solar Rotating Car Air Freshener"},
    {"id": "15089797923182", "title": "Steering Wheel Tray Table"},
    {"id": "15086311801198", "title": "Telescopic Dashboard Phone Mount"},
    {"id": "15089798087022", "title": "Wet & Dry Car Vacuum Cleaner"},
    {"id": "15111471825262", "title": "Crystal Diamond Car Air Freshener"},
]

# Mapping from Drive image filename patterns to Shopify product titles
# The Drive filename contains keywords we can match to Shopify product titles
MAPPING_RULES = [
    # product-000 -> Mirror Dash Cam
    ("product-000", "Mirror Dash Cam 1080P"),
    # product-001 -> Small Eye Dash Cam (1080P High definition Three-record)
    ("product-001", "Small Eye Wifi Dash Cam Recorder"),
    # product-002 -> 3-in-1 Car Heater Defogger
    ("product-002", "3-in-1 Car Heater Defogger Fan"),
    # product-003 -> 360 Rearview Mirror Phone Mount
    ("product-003", "360 Rearview Mirror Phone Mount"),
    # product-004 -> 5000Pa Handheld Car Vacuum
    ("product-004", "5000Pa Handheld Car Vacuum"),
    # product-005 -> 7-Inch Wireless CarPlay Display
    ("product-005", "7-Inch Wireless CarPlay Display"),
    # product-006 -> NOT IN STORE (Aluminum 13 Row Oil Cooler)
    # product-007 -> NOT IN STORE (Aluminum 19 Row Oil Cooler)
    # product-008 -> Mini Anti-Lost GPS Tracker Alarm
    ("product-008", "Mini Anti-Lost GPS Tracker Alarm"),
    # product-009 -> AutoClean Wireless Mini Vacuum
    ("product-009", "AutoClean Wireless Mini Vacuum"),
    # product-010 -> NOT IN STORE (Automatic Glass Wiper)
    # product-011 -> Headlight Restoration Repair Liquid
    ("product-011", "Headlight Restoration Repair Liquid"),
    # product-012 -> NOT IN STORE (Bicycle Repair Tool)
    # product-013 -> Car Armrest Box Cushion Pad
    ("product-013", "Car Armrest Box Cushion Pad"),
    # product-014 -> NOT IN STORE (Car Accessories for Women Aromatherapy)
    # product-015 -> Car Aromatherapy Diffuser & Purifier
    ("product-015", "Car Aromatherapy Diffuser & Purifier"),
    # product-016 -> Cloud Mist Car Aroma Diffuser
    ("product-016", "Cloud Mist Car Aroma Diffuser"),
    # product-017 -> Car Bluetooth FM Transmitter MP3
    ("product-017", "Car Bluetooth FM Transmitter MP3"),
    # product-018 -> Carbon Fiber Bumper Guard Strips
    ("product-018", "Carbon Fiber Bumper Guard Strips"),
    # product-019 -> Extendable Snow Brush Ice Scraper
    ("product-019", "Extendable Snow Brush Ice Scraper"),
    # product-020 -> Car Seat Neck Support Pillow
    ("product-020", "Car Seat Neck Support Pillow"),
    # product-021 -> 12V Car Seat Heating Cushion
    ("product-021", "12V Car Seat Heating Cushion"),
    # product-022 -> Mini Car Humidifier & Air Purifier
    ("product-022", "Mini Car Humidifier & Air Purifier"),
    # product-023 -> Car LED Ambient Light Strip
    ("product-023", "Car LED Ambient Light Strip"),
    # product-024 -> LED Daytime Running Light Bar
    ("product-024", "LED Daytime Running Light Bar"),
    # product-025 -> LED Turn Signal Light Strip
    ("product-025", "LED Turn Signal Light Strip"),
    # product-026 -> Cordless Car Polishing Machine
    ("product-026", "Cordless Car Polishing Machine"),
    # product-027 -> Smartphone Heads-Up Display Mount (Rearview Mirror Swivel)
    ("product-027", "Smartphone Heads-Up Display Mount"),
    # product-028 -> Car Scratch Remover Repair Kit
    ("product-028", "Car Scratch Remover Repair Kit"),
    # product-029 -> Magnetic Windshield Snow Cover
    ("product-029", "Magnetic Windshield Snow Cover"),
    # product-030 -> Car Seat Back Storage Pocket
    ("product-030", "Car Seat Back Storage Pocket"),
    # product-031 -> Car Seat Storage Organizer Bag
    ("product-031", "Car Seat Storage Organizer Bag"),
    # product-032 -> Car Wash Cleaning Gloves
    ("product-032", "Car Wash Cleaning Gloves"),
    # product-033 -> NOT IN STORE (Carbon Fiber Door Handle)
    # product-034 -> RGB LED Cup Holder Coaster Light
    ("product-034", "RGB LED Cup Holder Coaster Light"),
    # product-035 -> Cordless Electric Ice Scraper
    ("product-035", "Cordless Electric Ice Scraper"),
    # product-036 -> Cordless Car Vacuum Cleaner
    ("product-036", "Cordless Car Vacuum Cleaner"),
    # product-037 -> Microfiber Car Detailing Towels
    ("product-037", "Microfiber Car Detailing Towels"),
    # product-038 -> 2-in-1 Foldable Car Cup Holder
    ("product-038", "2-in-1 Foldable Car Cup Holder"),
    # product-039 -> MISSING
    # product-040 -> NOT IN STORE (Glow in Dark Window Switch)
    # product-041 -> Motorcycle Helmet LED Signal Strip
    ("product-041", "Motorcycle Helmet LED Signal Strip"),
    # product-042 -> Wet & Dry Car Vacuum Cleaner
    ("product-042", "Wet & Dry Car Vacuum Cleaner"),
    # product-043 -> High Pressure Foam Spray Gun
    ("product-043", "High Pressure Foam Spray Gun"),
    # product-044 -> Premium Seatback Car Organizer (Leather)
    ("product-044", "Premium Seatback Car Organizer"),
    # product-045 -> Inflatable Car Travel Air Mattress
    ("product-045", "Inflatable Car Travel Air Mattress"),
    # product-046 -> Magnetic Mini GPS Car Tracker
    ("product-046", "Magnetic Mini GPS Car Tracker"),
    # product-047 -> Magnetic Car Windshield Cover
    ("product-047", "Magnetic Car Windshield Cover"),
    # product-048 -> Car Seat Gap Felt Organizer
    ("product-048", "Car Seat Gap Felt Organizer"),
    # product-049 -> Backseat Folding Car Desk Tray
    ("product-049", "Backseat Folding Car Desk Tray"),
    # product-050 -> 4-in-1 Non-Slip Phone Dash Mat
    ("product-050", "4-in-1 Non-Slip Phone Dash Mat"),
    # product-051 -> ECO OBD2 Fuel Saver Chip
    ("product-051", "ECO OBD2 Fuel Saver Chip"),
    # product-052 -> Kinetic Solar Car Air Freshener
    ("product-052", "Kinetic Solar Car Air Freshener"),
    # product-053 -> Smart LED Digital Tire Inflator
    ("product-053", "Smart LED Digital Tire Inflator"),
    # product-054 -> Portable 12V Windshield Defroster
    ("product-054", "Portable 12V Windshield Defroster"),
    # product-055 -> Mini Dual-Purpose Car Vacuum
    ("product-055", "Mini Dual-Purpose Car Vacuum"),
    # product-056 -> Rotating Multi-Angle Door Cup Holder
    ("product-056", "Rotating Multi-Angle Door Cup Holder"),
    # product-057 -> Small Eye Wifi Dash Cam Recorder
    ("product-057", "Small Eye Wifi Dash Cam Recorder"),
    # product-058 -> Smartphone Heads-Up Display Mount (duplicate of 027)
    # Skip - already mapped to 027
    # product-059 -> Emergency Snow Tire Chains
    ("product-059", "Emergency Snow Tire Chains"),
    # product-060 -> Solar Rotating Car Air Freshener
    ("product-060", "Solar Rotating Car Air Freshener"),
    # product-061 -> Steering Wheel Tray Table
    ("product-061", "Steering Wheel Tray Table"),
    # product-062 -> Telescopic Dashboard Phone Mount
    ("product-062", "Telescopic Dashboard Phone Mount"),
    # product-063 -> NOT IN STORE (Carbon Fiber Car Radio Antenna)
    # product-064 -> Premium Seatback Car Organizer (duplicate of 044)
    # Skip - already mapped to 044
    # sun-shade -> Foldable Windshield Sun Shade
    ("product-sun-shade", "Foldable Windshield Sun Shade"),
]

# Build lookup: product_id -> drive filename
product_id_to_file = {}
title_to_id = {p["title"]: p["id"] for p in SHOPIFY_PRODUCTS}

mapping = []
unmatched = []
for prefix, title in MAPPING_RULES:
    pid = title_to_id.get(title)
    if not pid:
        print(f"WARNING: No Shopify product found for '{title}'")
        continue
    # Find the matching drive file
    matching_files = [f for f in drive_files if f.startswith(prefix)]
    if not matching_files:
        print(f"WARNING: No drive file for prefix '{prefix}'")
        continue
    fname = matching_files[0]
    fpath = os.path.join(DRIVE_DIR, fname)
    fsize = os.path.getsize(fpath)
    mapping.append({
        "shopify_product_id": pid,
        "shopify_title": title,
        "drive_file": fname,
        "file_size": fsize,
    })

print(f"\nTotal mappings: {len(mapping)}")
print(f"Products in store: {len(SHOPIFY_PRODUCTS)}")
print(f"Unmatched Drive images: {len([f for f in drive_files if not any(m['drive_file'] == f for m in mapping)])}")

# Write mapping to JSON
with open("/app/workspace/drive_covers/mapping.json", "w") as f:
    json.dump(mapping, f, indent=2)

print("\nMapping written to drive_covers/mapping.json")
for m in mapping:
    print(f"  {m['drive_file']} -> {m['shopify_title']} ({m['file_size']} bytes)")
