/**
 * Restore missing Shopify variants from CJ Dropshipping CSV export.
 *
 * Usage: bun run scripts/restore-variants.ts
 * Requires SHOPIFY_ACCESS_TOKEN in env (or uses cached token)
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  SHOPIFY_API, ensureValidToken, fetchAllShopifyProducts,
} from '../src/lib/shopify-helpers'
import { readCache } from '../src/lib/product-cache'

// ── Parse CJ CSV ─────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

interface CjVariant {
  title: string
  specification: string
}

interface CjProduct {
  cjTitle: string
  variants: CjVariant[]
}

function loadCjProducts(): CjProduct[] {
  const csvPath = join(process.cwd(), 'cj-products.csv')
  if (!existsSync(csvPath)) {
    console.error('[restore] cj-products.csv not found')
    return []
  }
  const raw = readFileSync(csvPath, 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim())
  // Skip header
  const dataLines = lines.slice(1)

  const byTitle = new Map<string, CjVariant[]>()

  for (const line of dataLines) {
    const cols = parseCsvLine(line)
    const cjTitle = cols[0] || ''
    const specification = cols[3] || ''
    if (!cjTitle || !specification) continue

    if (!byTitle.has(cjTitle)) byTitle.set(cjTitle, [])
    byTitle.get(cjTitle)!.push({ title: specification, specification })
  }

  return Array.from(byTitle.entries()).map(([cjTitle, variants]) => ({
    cjTitle,
    variants,
  }))
}

// ── Fuzzy title matching ─────────────────────────────────────

function normalizeTitle(t: string): string {
  return t.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (na === nb) return 1

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.9

  // Token overlap
  const tokensA = new Set(na.split(' '))
  const tokensB = new Set(nb.split(' '))
  const intersection = [...tokensA].filter(t => tokensB.has(t))
  const union = new Set([...tokensA, ...tokensB])
  return intersection.length / union.size
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const token = await ensureValidToken()
  if (!token) {
    console.error('[restore] No valid Shopify token')
    process.exit(1)
  }

  // Load CJ products
  const cjProducts = loadCjProducts()
  console.log(`[restore] Loaded ${cjProducts.length} CJ products with ${cjProducts.reduce((s, p) => s + p.variants.length, 0)} variants`)

  // Load live Shopify products
  const rawProducts = await fetchAllShopifyProducts()
  const liveProducts = rawProducts.filter((p: any) => p.status === 'active')
  console.log(`[restore] ${liveProducts.length} active Shopify products`)

  // Match CJ → Shopify by title similarity
  const matches: Array<{ cj: CjProduct; live: any; score: number }> = []

  for (const cj of cjProducts) {
    let bestMatch: any = null
    let bestScore = 0

    for (const live of liveProducts) {
      const score = titleSimilarity(cj.cjTitle, live.title)
      if (score > bestScore) {
        bestScore = score
        bestMatch = live
      }
    }

    if (bestMatch && bestScore >= 0.3) {
      matches.push({ cj, live: bestMatch, score: bestScore })
      if (bestScore < 0.5) {
        console.log(`[restore] Low-confidence match: "${cj.cjTitle}" → "${bestMatch.title}" (${(bestScore * 100).toFixed(0)}%)`)
      }
    } else {
      console.log(`[restore] No match for: "${cj.cjTitle}"`)
    }
  }

  console.log(`[restore] Matched ${matches.length}/${cjProducts.length} CJ products`)

  // Create missing variants
  let created = 0
  let skipped = 0
  let errors = 0

  for (const { cj, live } of matches) {
    const existingTitles = new Set((live.variants || []).map((v: any) => v.title))

    for (const cv of cj.variants) {
      if (existingTitles.has(cv.title)) {
        skipped++
        continue
      }

      try {
        const res = await fetch(`${SHOPIFY_API}/products/${live.id}/variants.json`, {
          method: 'POST',
          headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variant: {
              product_id: live.id,
              title: cv.title,
              price: '6.00', // Will be fixed by pricing logic later
            },
          }),
        })

        if (res.ok) {
          created++
          console.log(`[restore] ✅ Created "${cv.title}" for "${live.title}"`)
        } else {
          const errText = await res.text()
          console.log(`[restore] ❌ Failed "${cv.title}" for "${live.title}": ${res.status} ${errText.slice(0, 100)}`)
          errors++
        }
      } catch (err: any) {
        console.error(`[restore] ❌ Error "${cv.title}": ${err.message}`)
        errors++
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 350))
    }
  }

  console.log(`\n[restore] Done! Created: ${created}, Skipped (existed): ${skipped}, Errors: ${errors}`)
}

main().catch(err => {
  console.error('[restore] Fatal:', err)
  process.exit(1)
})
