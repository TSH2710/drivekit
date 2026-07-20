#!/bin/bash
# Fix cover images - make first image position 1 for all products
PROD_URL="https://drivekit-production.up.railway.app"

# Get all product IDs
PRODUCT_IDS=$(curl -s "$PROD_URL/api/shopify/products" 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('products', []):
    print(p['id'])
")

TOKEN_STATUS=$(curl -s "$PROD_URL/api/shopify/token-status" 2>&1)

for PID in $PRODUCT_IDS; do
  # Get first image ID for this product
  FIRST_IMG=$(curl -s "$PROD_URL/api/shopify/products" 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('products', []):
    if str(p['id']) == '$PID':
        imgs = p.get('images', [])
        if imgs:
            print(imgs[0]['id'])
        break
")
  
  if [ -z "$FIRST_IMG" ]; then
    continue
  fi
  
  # Move the first image to position 1 (cover)
  RESULT=$(curl -s -X PUT "https://dr1vekit.myshopify.com/admin/api/2024-01/products/$PID/images/$FIRST_IMG.json" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Access-Token: $(cat /app/workspace/.shopify-token-cache.json 2>/dev/null | python3 -c 'import sys,json; print(json.load(sys.stdin).get("accessToken",""))' 2>/dev/null)" \
    -d "{\"image\":{\"id\":$FIRST_IMG,\"position\":1}}" 2>&1)
  
  echo "Product $PID: image $FIRST_IMG -> position 1"
done

echo "Done!"
