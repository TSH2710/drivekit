// Create a 100% off discount code "OWNER" in Shopify
import { ensureValidToken } from '../src/lib/shopify-helpers.ts'
import { SHOPIFY_API } from '../src/lib/shopify-helpers.ts'

async function createDiscount() {
  const token = await ensureValidToken()
  if (!token) { console.error('No valid Shopify token'); process.exit(1) }

  // Step 1: Create a price rule for 100% off
  const priceRuleRes = await fetch(`${SHOPIFY_API}/price_rules.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      price_rule: {
        title: 'OWNER - 100% Off',
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        value_type: 'percentage',
        value: '-100.0',
        starts_at: '2024-01-01T00:00:00Z',
        usage_limit: null,
        customer_selection: 'all',
      }
    })
  })

  const priceRuleData = await priceRuleRes.json()
  if (!priceRuleRes.ok) {
    console.error('Failed to create price rule:', priceRuleData)
    process.exit(1)
  }
  const ruleId = priceRuleData.price_rule.id
  console.log(`Price rule created: ${ruleId}`)

  // Step 2: Create the discount code "OWNER"
  const codeRes = await fetch(`${SHOPIFY_API}/price_rules/${ruleId}/discount_codes.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      discount_code: { code: 'OWNER' }
    })
  })

  const codeData = await codeRes.json()
  if (!codeRes.ok) {
    console.error('Failed to create discount code:', codeData)
    process.exit(1)
  }
  console.log(`Discount code created: OWNER (id: ${codeData.discount_code.id})`)
  console.log('✅ Done! The OWNER code will give 100% off at Shopify checkout.')
}

createDiscount().catch(err => { console.error(err); process.exit(1) })
