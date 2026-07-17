#!/usr/bin/env node
/**
 * Update 4-in-1 Phone Dash Mat:
 * 1. Fix retail prices (revert from CJ cost)
 * 2. Assign images to color variants
 */

const RAILWAY_URL = 'https://drivekit-production.up.railway.app'
const PRODUCT_ID = '15089798545774'

// Retail prices — revert from CJ cost to proper markup
const PRICE_MAP = {
  '1PC': '9.99',
  '2PCS': '16.99',
}

async function main() {
  // Step 1: Get current product data from our API
  console.log('Fetching product data...')
  const res = await fetch(`${RAILWAY_URL}/api/shopify/products`)
  const data = await res.json()
  const product = data.products.find(p => p.id == PRODUCT_ID || String(p.id) === PRODUCT_ID)
  
  if (!product) {
    // Try by title
    const alt = data.products.find(p => p.title.includes('4-in-1') || p.title.includes('Phone Dash Mat'))
    if (!alt) { console.error('Product not found'); process.exit(1) }
    console.log(`Found by title: ${alt.title} (id=${alt.id})`)
  }
  
  const p = product || data.products.find(p => p.title.includes('4-in-1'))
  console.log(`Product: ${p.title} (id=${p.id})`)
  console.log(`Variants: ${p.variants.length}`)
  console.log(`Images: ${p.images.length}`)
  
  // Step 2: Build variant price update payload
  // We need to update via Shopify directly — use the endpoint we created
  // But our endpoint replaces ALL variants. Let's use a simpler approach:
  // Just update prices and images via the REST API directly
  
  // Actually, let's just call the update-variants endpoint with fixed prices
  const options = p.options
  const variants = p.variants.map(v => {
    // Determine quantity from title
    const qty = v.title.includes('2PCS') ? '2PCS' : '1PC'
    return {
      optionValues: {
        [options[0]?.name || 'Color']: v.option1 || v.title.split(' / ')[0],
        [options[1]?.name || 'Quantity']: qty,
      },
      price: PRICE_MAP[qty] || '9.99',
      sku: v.sku || '',
    }
  })

  console.log('\nUpdating variant prices...')
  for (const v of variants) {
    console.log(`  ${Object.values(v.optionValues).join(' / ')} → $${v.price}`)
  }

  const updateRes = await fetch(`${RAILWAY_URL}/api/shopify/update-variants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: String(p.id),
      options,
      variants,
    }),
  })
  
  const result = await updateRes.json()
  if (result.ok) {
    console.log(`\n✅ Updated ${result.totalVariants} variants with retail prices`)
    console.log('Steps:', result.steps?.join(', '))
  } else {
    console.error('❌ Update failed:', result.error)
    console.error('Steps so far:', result.steps)
  }

  // Step 3: Verify
  console.log('\nVerifying...')
  const verifyRes = await fetch(`${RAILWAY_URL}/api/shopify/products`)
  const verifyData = await verifyRes.json()
  const vp = verifyData.products.find(p => p.id == PRODUCT_ID || String(p.id) === PRODUCT_ID) || verifyData.products.find(p => p.title.includes('4-in-1'))
  if (vp) {
    console.log(`\n📦 ${vp.title}`)
    for (const v of vp.variants) {
      console.log(`  ${v.title.padEnd(35)} $${v.price}  sku=${v.sku || '—'}`)
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
