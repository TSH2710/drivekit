#!/usr/bin/env node
/**
 * Update 4-in-1 Non-Slip Phone Dash Mat with all CJ variants
 * Product ID: 15089798545774
 */

const SHOPIFY_API = 'https://dr1vekit.myshopify.com/admin/api/2024-10'
const PRODUCT_ID = '15089798545774'
const RAILWAY_URL = 'https://drivekit-production.up.railway.app'

const VARIANTS = [
  { color: 'Red', qty: '1PC', sku: 'CJQC138570801AZ', price: '1.43' },
  { color: 'Red', qty: '2PCS', sku: 'CJQC138570806FU', price: '3.42' },
  { color: 'White', qty: '1PC', sku: 'CJQC138570802BY', price: '1.84' },
  { color: 'White', qty: '2PCS', sku: 'CJQC138570810JQ', price: '3.52' },
  { color: 'Black', qty: '1PC', sku: 'CJQC138570803CX', price: '1.65' },
  { color: 'Black', qty: '2PCS', sku: 'CJQC138570809IR', price: '2.99' },
  { color: 'Red A', qty: '1PC', sku: 'CJQC138570804DW', price: '1.65' },
  { color: 'Red A', qty: '2PCS', sku: 'CJQC138570808HS', price: '2.99' },
  { color: 'Cartoon', qty: '1PC', sku: 'CJQC138570805EV', price: '1.59' },
  { color: 'Cartoon', qty: '2PCS', sku: 'CJQC138570807GT', price: '3.03' },
  { color: 'Chinese dream', qty: '1PC', sku: 'CJQC138570811KP', price: '1.35' },
  { color: 'Safe journey', qty: '1PC', sku: 'CJQC138570813MN', price: '1.35' },
  { color: 'Single bracket', qty: '1PC', sku: 'CJQC138570815OL', price: '1.50' },
]

async function getToken() {
  // Try env var first
  if (process.env.SHOPIFY_ACCESS_TOKEN) return process.env.SHOPIFY_ACCESS_TOKEN
  
  // Try Railway endpoint
  const res = await fetch(`${RAILWAY_URL}/api/shopify/token-status`)
  const data = await res.json()
  console.log('Token status:', JSON.stringify(data))
  
  // Try getting from cache file
  const { existsSync, readFileSync } = await import('fs')
  const { join } = await import('path')
  const cachePaths = [
    join(process.cwd(), '.shopify-token-cache.json'),
    join(process.cwd(), 'shopify-token-cache.json'),
    join(process.cwd(), '.cache', 'shopify-token.json'),
  ]
  for (const p of cachePaths) {
    if (existsSync(p)) {
      const cache = JSON.parse(readFileSync(p, 'utf-8'))
      if (cache.accessToken) return cache.accessToken
    }
  }
  
  throw new Error('No Shopify token found')
}

async function shopifyGraphQL(token, query, variables = {}) {
  const res = await fetch(`${SHOPIFY_API}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  })
  const data = await res.json()
  if (data.errors) {
    console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2))
    throw new Error(data.errors[0]?.message || 'GraphQL error')
  }
  return data.data
}

async function main() {
  const token = await getToken()
  console.log('✅ Token obtained')

  // Step 1: Get current product state
  console.log('\n--- Step 1: Fetch current product ---')
  const productData = await shopifyGraphQL(token, `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id title handle
        options { id name values }
        variants(first: 50) {
          edges { node { id title optionValues { name option { name } } } }
        }
      }
    }
  `, { id: `gid://shopify/Product/${PRODUCT_ID}` })

  const product = productData.product
  if (!product) { console.error('Product not found!'); process.exit(1) }
  console.log(`Product: ${product.title} (${product.handle})`)
  console.log(`Current options: ${JSON.stringify(product.options)}`)
  console.log(`Current variants: ${product.variants.edges.length}`)

  // Step 2: Delete all existing variants except the first one (Shopify requires at least 1)
  console.log('\n--- Step 2: Delete existing variants ---')
  const existingVariants = product.variants.edges.map(e => e.node.id)
  const keepVariant = existingVariants[0]
  const deleteVariants = existingVariants.slice(1)

  if (deleteVariants.length > 0) {
    // Use productVariantsBulkDelete mutation
    const delRes = await shopifyGraphQL(token, `
      mutation DeleteVariants($productId: ID!, $variants: [ID!]!) {
        productVariantsBulkDelete(productId: $productId, variants: $variants) {
          product { id }
          userErrors { field message }
        }
      }
    `, { productId: `gid://shopify/Product/${PRODUCT_ID}`, variants: deleteVariants })
    
    const errors = delRes.productVariantsBulkDelete?.userErrors || []
    if (errors.length > 0) {
      console.error('Delete errors:', errors)
      throw new Error('Failed to delete variants')
    }
    console.log(`Deleted ${deleteVariants.length} variants, keeping 1`)
  }

  // Step 3: Remove existing options
  console.log('\n--- Step 3: Remove existing options ---')
  for (const opt of product.options) {
    try {
      const delOptRes = await shopifyGraphQL(token, `
        mutation DeleteOption($productId: ID!, $optionId: ID!) {
          productOptionDelete(productId: $productId, optionId: $optionId) {
            deletedProductOptionId
            product { id options { name values } }
            userErrors { field message }
          }
        }
      `, { 
        productId: `gid://shopify/Product/${PRODUCT_ID}`,
        optionId: opt.id 
      })
      const errors = delOptRes.productOptionDelete?.userErrors || []
      if (errors.length > 0) {
        console.log(`  Skip option "${opt.name}": ${errors[0].message}`)
      } else {
        console.log(`  Removed option: ${opt.name}`)
      }
    } catch (e) {
      console.log(`  Skip option "${opt.name}": ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 500))
  }

  // Step 4: Add new options (Color and Quantity)
  console.log('\n--- Step 4: Add new options ---')
  const colors = [...new Set(VARIANTS.map(v => v.color))]
  const quantities = [...new Set(VARIANTS.map(v => v.qty))]

  // Add Color option
  const colorRes = await shopifyGraphQL(token, `
    mutation AddOption($productId: ID!, $option: ProductOptionInput!) {
      productOptionCreate(productId: $productId, option: $option) {
        product { id options { id name values } }
        userErrors { field message }
      }
    }
  `, {
    productId: `gid://shopify/Product/${PRODUCT_ID}`,
    option: { name: 'Color', values: colors.map(c => ({ name: c })) }
  })
  const colorErrors = colorRes.productOptionCreate?.userErrors || []
  if (colorErrors.length > 0) throw new Error(`Color option error: ${colorErrors[0].message}`)
  console.log(`  Added Color option with ${colors.length} values: ${colors.join(', ')}`)
  
  // Get the Color option ID for later use
  const colorOptionId = colorRes.productOptionCreate?.product?.options?.find(o => o.name === 'Color')?.id
  await new Promise(r => setTimeout(r, 500))

  // Add Quantity option
  const qtyRes = await shopifyGraphQL(token, `
    mutation AddOption($productId: ID!, $option: ProductOptionInput!) {
      productOptionCreate(productId: $productId, option: $option) {
        product { id options { id name values } }
        userErrors { field message }
      }
    }
  `, {
    productId: `gid://shopify/Product/${PRODUCT_ID}`,
    option: { name: 'Quantity', values: quantities.map(q => ({ name: q })) }
  })
  const qtyErrors = qtyRes.productOptionCreate?.userErrors || []
  if (qtyErrors.length > 0) throw new Error(`Quantity option error: ${qtyErrors[0].message}`)
  console.log(`  Added Quantity option with ${quantities.length} values: ${quantities.join(', ')}`)
  
  const qtyOptionId = qtyRes.productOptionCreate?.product?.options?.find(o => o.name === 'Quantity')?.id
  await new Promise(r => setTimeout(r, 500))

  // Step 5: Create all variants using bulk mutation
  console.log('\n--- Step 5: Create variants ---')
  
  // Use productVariantsBulkCreate with the full variant specs
  const bulkVariants = VARIANTS.map(v => ({
    optionValues: [
      { optionName: 'Color', name: v.color },
      { optionName: 'Quantity', name: v.qty },
    ],
    price: v.price,
    sku: v.sku,
    inventoryPolicy: 'DENY',
    inventoryManagement: null,
  }))

  // Shopify limits bulk create to ~100 at a time, we have 13 so it's fine
  const createRes = await shopifyGraphQL(token, `
    mutation BulkCreateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants) {
        product { id }
        productVariants { id title sku price selectedOptions { optionName value } }
        userErrors { field message }
      }
    }
  `, {
    productId: `gid://shopify/Product/${PRODUCT_ID}`,
    variants: bulkVariants,
  })

  const createErrors = createRes.productVariantsBulkCreate?.userErrors || []
  if (createErrors.length > 0) {
    console.error('Create errors:', JSON.stringify(createErrors, null, 2))
    throw new Error(`Variant creation failed: ${createErrors[0].message}`)
  }

  const createdVariants = createRes.productVariantsBulkCreate?.productVariants || []
  console.log(`\n✅ Created ${createdVariants.length} variants!`)
  for (const v of createdVariants) {
    const opts = v.selectedOptions.map(o => `${o.optionName}: ${o.value}`).join(' | ')
    console.log(`  ${v.title} — SKU: ${v.sku} — $${v.price} — ${opts}`)
  }

  // Step 6: Verify final state
  console.log('\n--- Step 6: Verify ---')
  const verifyData = await shopifyGraphQL(token, `
    query GetProduct($id: ID!) {
      product(id: $id) {
        title
        options { name values }
        variants(first: 50) {
          edges { node { title sku price selectedOptions { optionName value } } }
        }
      }
    }
  `, { id: `gid://shopify/Product/${PRODUCT_ID}` })

  const final = verifyData.product
  console.log(`\n📦 ${final.title}`)
  console.log(`Options: ${final.options.map(o => `${o.name} (${o.values.join(', ')})`).join(' + ')}`)
  console.log(`Variants: ${final.variants.edges.length}`)
  for (const v of final.variants.edges) {
    const n = v.node
    console.log(`  ✅ ${n.title} — SKU: ${n.sku} — $${n.price}`)
  }

  // Step 7: Refresh the product cache on the server
  console.log('\n--- Step 7: Refresh cache ---')
  try {
    const cacheRes = await fetch(`${RAILWAY_URL}/api/shopify/cache/refresh`)
    const cacheData = await cacheRes.json()
    console.log(`Cache refreshed: ${cacheData.count} products`)
  } catch (e) {
    console.log(`Cache refresh failed (will auto-refresh): ${e.message}`)
  }

  console.log('\n🎉 Done! Product updated with all CJ variants.')
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message)
  process.exit(1)
})
