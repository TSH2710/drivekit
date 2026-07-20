// Remove "Red / 4PCS" and "4PCS" variants from Carbon Fiber Bumper Guard Strips
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const TOKEN_FILE = resolve('./data/shopify-token.json')
const SHOPIFY_STORE = process.env.SHOPIFY_SHOP_DOMAIN || 'dr1vekit'
const SHOPIFY_API = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2024-10`

function getToken(): string {
  if (existsSync(TOKEN_FILE)) {
    const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf-8'))
    return data.accessToken
  }
  return process.env.SHOPIFY_ACCESS_TOKEN || ''
}

const token = getToken()
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
const PRODUCT_ID = 15089799233902

async function main() {
  console.log(`Fetching product ${PRODUCT_ID}...`)
  const res = await fetch(`${SHOPIFY_API}/products/${PRODUCT_ID}.json`, { headers })
  if (!res.ok) {
    console.error(`Failed to fetch product: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  const { product } = await res.json() as any

  console.log(`Product: ${product.title}`)
  console.log(`Current variants: ${product.variants.length}`)

  // Remove only the "Red / 4PCS" variant
  const toRemove = product.variants.filter((v: any) => v.title === 'Red / 4PCS')
  const toKeep = product.variants.filter((v: any) => v.title !== 'Red / 4PCS')

  console.log(`\nRemoving ${toRemove.length} variant(s):`)
  toRemove.forEach((v: any) => console.log(`  - ${v.title} (ID: ${v.id})`))

  console.log(`\nKeeping ${toKeep.length} variant(s):`)
  toKeep.forEach((v: any) => console.log(`  - ${v.title} (ID: ${v.id})`))

  // Update product with only the kept variants
  // Shopify requires sending variant IDs to keep; removed ones get deleted
  const updateRes = await fetch(`${SHOPIFY_API}/products/${PRODUCT_ID}.json`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      product: {
        id: PRODUCT_ID,
        variants: toKeep.map((v: any) => ({
          id: v.id,
          option1: v.option1,
          option2: v.option2,
          price: v.price,
        })),
      },
    }),
  })

  if (!updateRes.ok) {
    console.error(`Failed to update product: ${updateRes.status} ${await updateRes.text()}`)
    process.exit(1)
  }

  const updated = await updateRes.json() as any
  console.log(`\n✅ Updated! Product now has ${updated.product.variants.length} variant(s):`)
  updated.product.variants.forEach((v: any) => console.log(`  - ${v.title} ($${v.price})`))
}

main().catch(console.error)
