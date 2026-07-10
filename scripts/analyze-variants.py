#!/usr/bin/env python3
"""Analyze Shopify product images to detect which single-variant products need multiple variants."""
import json, urllib.request, io, os

# Simple color detection from image dominant colors
def get_dominant_colors(img_data, num_colors=5):
    """Extract dominant colors from JPEG using simple pixel sampling."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(img_data)).convert('RGB')
        # Resize for speed
        img = img.resize((100, 100))
        pixels = list(img.getdata())
        
        # Simple color bucketing
        buckets = {}
        for r, g, b in pixels:
            # Quantize to 8 levels per channel
            qr, qg, qb = r // 32, g // 32, b // 32
            key = (qr, qg, qb)
            buckets[key] = buckets.get(key, 0) + 1
        
        # Get top colors
        sorted_buckets = sorted(buckets.items(), key=lambda x: -x[1])
        
        # Convert back to rough RGB
        colors = []
        for (qr, qg, qb), count in sorted_buckets[:num_colors]:
            r_approx = qr * 32 + 16
            g_approx = qg * 32 + 16
            b_approx = qb * 32 + 16
            colors.append((r_approx, g_approx, b_approx))
        
        return colors
    except Exception as e:
        return []

def classify_color(r, g, b):
    """Classify an RGB color into a named color."""
    # Black
    if r < 60 and g < 60 and b < 60:
        return "Black"
    # White
    if r > 200 and g > 200 and b > 200:
        return "White"
    # Gray
    if abs(r - g) < 30 and abs(g - b) < 30 and 80 < r < 200:
        return "Gray"
    # Red
    if r > 150 and g < 80 and b < 80:
        return "Red"
    # Dark red / wine
    if r > 100 and g < 60 and b < 60:
        return "Red"
    # Blue
    if b > 150 and r < 100 and g < 150:
        return "Blue"
    # Light blue
    if b > 150 and g > 150 and r < 150:
        return "Light Blue"
    # Green
    if g > 150 and r < 100 and b < 100:
        return "Green"
    # Yellow
    if r > 180 and g > 180 and b < 80:
        return "Yellow"
    # Orange
    if r > 180 and g > 80 and g < 180 and b < 80:
        return "Orange"
    # Pink
    if r > 180 and g < 150 and b > 100:
        return "Pink"
    # Purple
    if r > 100 and b > 100 and g < 80:
        return "Purple"
    # Brown / Beige
    if r > 100 and g > 60 and b < 80:
        return "Brown"
    # Beige / Tan
    if r > 150 and g > 120 and b > 80 and r > b:
        return "Beige"
    # Silver
    if abs(r - g) < 40 and abs(g - b) < 40 and 150 < r < 220:
        return "Silver"
    return f"Color({r},{g},{b})"

# Fetch product cache from Railway
url = "https://drivekit-production.up.railway.app/api/shopify/products?limit=250"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())

products = data.get('products', [])

# Check single-variant products with options and many images
results = []
for p in products:
    vcount = len(p.get('variants', []))
    opts = p.get('options', [])
    images = p.get('images', [])
    
    if vcount == 1 and opts and len(images) >= 2:
        # Download first few images and analyze colors
        image_colors = set()
        for img in images[:6]:
            img_url = img['src']
            try:
                req = urllib.request.Request(img_url)
                with urllib.request.urlopen(req, timeout=10) as img_resp:
                    img_data = img_resp.read()
                colors = get_dominant_colors(img_data, 3)
                for r, g, b in colors:
                    name = classify_color(r, g, b)
                    if name not in ('Black', 'White', 'Gray', 'Silver'):
                        image_colors.add(name)
            except Exception as e:
                pass
        
        # Filter out generic colors, keep meaningful ones
        meaningful = [c for c in image_colors if not c.startswith('Color(')]
        
        if len(meaningful) >= 2:
            results.append({
                'id': p['id'],
                'title': p['title'],
                'handle': p['handle'],
                'images': len(images),
                'colors': sorted(meaningful),
                'option_name': opts[0]['name'] if opts else 'Color'
            })

print(f"\n{'='*80}")
print(f"PRODUCTS THAT LIKELY NEED MULTIPLE COLOR VARIANTS")
print(f"{'='*80}\n")
for r in sorted(results, key=lambda x: -x['images']):
    print(f"📦 {r['title']}")
    print(f"   ID: {r['id']} | Handle: {r['handle']}")
    print(f"   Images: {r['images']} | Detected colors: {r['colors']}")
    print(f"   Option name: {r['option_name']}")
    print()

print(f"\nTotal products needing variants: {len(results)}")
