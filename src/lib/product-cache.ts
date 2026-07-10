import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import type { ShopifyProduct } from './shopify-helpers'

export const CACHE_DIR = './data'
export const CACHE_FILE = `${CACHE_DIR}/shopify-products.json`
const KNOWN_PRODUCTS_FILE = `${CACHE_DIR}/known-products.json`
const CACHE_MAX_AGE_MS = 5 * 60 * 1000

interface KnownProductsData {
  knownIds: number[]
  lastSyncAt: string
  currentBatch?: number
  productsPerBatch?: number
}

export function readKnownProducts(): KnownProductsData {
  if (!existsSync(KNOWN_PRODUCTS_FILE)) return { knownIds: [], lastSyncAt: '' }
  try {
    return JSON.parse(readFileSync(KNOWN_PRODUCTS_FILE, 'utf-8'))
  } catch { return { knownIds: [], lastSyncAt: '' } }
}

export function writeKnownProducts(data: KnownProductsData) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(KNOWN_PRODUCTS_FILE, JSON.stringify(data, null, 2))
}

export function markProductsAsKnown(ids: number[]) {
  const data = readKnownProducts()
  const merged = [...new Set([...data.knownIds, ...ids])]
  writeKnownProducts({ ...data, knownIds: merged, lastSyncAt: new Date().toISOString() })
}

export function getNextBatchTag(newCount: number): string {
  const data = readKnownProducts()
  const currentBatch = data.currentBatch || 2
  const perBatch = data.productsPerBatch || 30
  const knownCount = data.knownIds.length
  const newBatchNum = Math.floor(knownCount / perBatch) + 1 + (newCount > 0 ? 0 : 0)
  return `Batch${Math.max(currentBatch + 1, newBatchNum)}`
}

const SUMMER_KEYWORDS = ['summer', 'cool', 'shade', 'sun', 'visor', 'windshield', 'cooling', 'vent', 'ventilat', 'window']

// ── Generated Image Lookup ────────────────────────────────────

const HANDLE_OVERRIDES: Record<string, string> = {}

let generatedImageMap: Map<number, string> | null = null

function buildGeneratedImageMap(): Map<number, string> {
  const map = new Map<number, string>()
  const genDir = `${process.cwd()}/generated-products`
  if (!existsSync(genDir)) return map
  try {
    const files = readdirSync(genDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
    for (const file of files) {
      const match = file.match(/^product-(\d{3})-/)
      if (match) {
        map.set(parseInt(match[1], 10), file)
      }
    }
  } catch {}
  return map
}

export function getGeneratedImageMap(): Map<number, string> {
  if (!generatedImageMap) generatedImageMap = buildGeneratedImageMap()
  return generatedImageMap
}

export function invalidateGeneratedImageMap() {
  generatedImageMap = null
}

// ── Product Shaping ───────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

export function shapeProduct(p: any) {
  const decodedHtml = decodeHtmlEntities(p.body_html ?? '')
  const genMap = getGeneratedImageMap()

  let images = (p.images ?? [])
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map((img: any) => ({
      id: img.id,
      src: img.src,
      alt: img.alt ?? p.title,
      width: img.width ?? 600,
      height: img.height ?? 600,
    }))

  const handleOverride = HANDLE_OVERRIDES[p.handle]
  if (handleOverride && images.length > 0) {
    images = [{ id: images[0].id, src: `/api/generated-images/${handleOverride}`, alt: images[0].alt ?? p.title, width: images[0].width ?? 600, height: images[0].height ?? 600 }, ...images.slice(1)]
  } else {
    let replaced = false
    for (const img of images) {
      const lifestyleMatch = img.src.match(/product-(\d{3})-lifestyle/)
      if (lifestyleMatch) {
        const idx = parseInt(lifestyleMatch[1], 10)
        const localFile = genMap.get(idx)
        if (localFile) {
          images = [{ id: img.id, src: `/api/generated-images/${localFile}`, alt: img.alt ?? p.title, width: img.width ?? 600, height: img.height ?? 600 }, ...images.filter(i => i.id !== img.id)]
          replaced = true
          break
        }
      }
    }
    if (!replaced && images.length > 0) {
      const titleLower = p.title.toLowerCase()
      for (const [idx, file] of genMap) {
        const fileLower = file.toLowerCase()
        const keywords = titleLower.split(/\s+/).filter((w: string) => w.length > 3)
        const matchCount = keywords.filter((k: string) => fileLower.includes(k)).length
        if (matchCount >= 5) {
          images = [{ id: images[0].id, src: `/api/generated-images/${file}`, alt: images[0].alt ?? p.title, width: images[0].width ?? 600, height: images[0].height ?? 600 }, ...images.slice(1)]
          break
        }
      }
    }
  }

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: decodedHtml.replace(/<[^>]*>/g, '').trim(),
    htmlDescription: decodedHtml,
    vendor: p.vendor ?? 'DriveKit',
    productType: p.product_type ?? '',
    tags: typeof p.tags === 'string' ? p.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : (p.tags ?? []),
    images,
    variants: (p.variants ?? []).map((v: any) => ({
      id: v.id,
      title: v.title,
      price: parseFloat(v.price),
      compareAtPrice: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      inStock: v.inventory_policy === 'continue' || (v.inventory_quantity ?? 0) > 0,
      inventoryQuantity: v.inventory_quantity ?? 0,
      sku: v.sku,
      grams: v.grams,
      weight: v.weight,
      weightUnit: v.weight_unit,
      imageId: v.image_id,
    })),
    options: (p.options ?? []).map((o: any) => ({
      name: o.name,
      values: o.values ?? [],
    })),
    minPrice: Math.min(...(p.variants ?? []).map((v: any) => parseFloat(v.price))),
    inStock: (p.variants ?? []).some((v: any) => v.inventory_policy === 'continue' || (v.inventory_quantity ?? 0) > 0),
  }
}

// ── Auto-Generate Product Image ──────────────────────────────

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || ''

export async function autoGenerateProductImage(product: ShopifyProduct): Promise<string | null> {
  if (!TOGETHER_API_KEY) {
    console.log('[auto-image] Together API key not configured, skipping')
    return null
  }

  const title = product.title
  const productType = product.product_type || ''
  const tags = typeof product.tags === 'string' ? product.tags : (product.tags ?? []).join(', ')

  const prompt = [
    `Professional product photography of "${title}",`,
    productType ? `${productType} car accessory,` : 'premium car accessory,',
    'clean studio lighting on white background,',
    'high-end commercial product photo,',
    'sharp focus, realistic, 8k quality,',
    'automotive product catalog style,',
    tags ? `themes: ${tags}` : '',
  ].filter(Boolean).join(' ')

  try {
    const res = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt,
        width: 1024,
        height: 1024,
        n: 1,
        steps: 4,
        response_format: 'b64_json',
      }),
    })

    const data = await res.json() as any
    if (!res.ok) {
      console.error('[auto-image] Together API error:', data?.error?.message || res.status)
      return null
    }

    const imgData = data?.data?.[0]
    if (!imgData?.b64_json) {
      console.error('[auto-image] No image data in response')
      return null
    }

    const genDir = join(process.cwd(), 'generated-products')
    if (!existsSync(genDir)) mkdirSync(genDir, { recursive: true })

    const handle = slugify(title)
    const filename = `product-${handle}.png`
    const filePath = join(genDir, filename)

    const buffer = Buffer.from(imgData.b64_json, 'base64')
    writeFileSync(filePath, buffer)
    console.log(`[auto-image] Generated image for "${title}" → ${filename}`)

    invalidateGeneratedImageMap()
    return filename
  } catch (err: any) {
    console.error('[auto-image] Failed:', err.message)
    return null
  }
}

// ── Cache Operations ──────────────────────────────────────────

export function readCache(): { products: ReturnType<typeof shapeProduct>[], syncedAt: string } | null {
  if (!existsSync(CACHE_FILE)) return null
  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8')
    const data = JSON.parse(raw)
    const age = Date.now() - new Date(data.syncedAt).getTime()
    if (age < CACHE_MAX_AGE_MS && data.products?.length > 0) return data
  } catch {}
  return null
}

export function writeCache(products: ReturnType<typeof shapeProduct>[]) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  if (existsSync(CACHE_FILE)) {
    try {
      const existing = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
      const existingCount = existing.products?.length ?? 0
      if (existingCount > 0 && products.length > 0 && products.length < existingCount - 5) {
        return
      }
    } catch {}
  }
  writeFileSync(CACHE_FILE, JSON.stringify({ products, syncedAt: new Date().toISOString() }, null, 2))
}

export async function fetchAndCacheProducts(fetchAllShopifyProducts: () => Promise<ShopifyProduct[]>) {
  try {
    const rawProducts = await fetchAllShopifyProducts()
    console.log(`[background-refresh] Found ${rawProducts.length} products from Shopify`)
    const shaped = rawProducts.filter((p) => p.status === 'active').map(shapeProduct)
    writeCache(shaped)
  } catch (err) {
    console.error('[background-refresh] Error:', err)
  }
}

export function isSummerProduct(product: { title: string; body_html?: string }): boolean {
  const combined = `${product.title} ${product.body_html || ''}`.toLowerCase()
  return SUMMER_KEYWORDS.some(kw => combined.includes(kw))
}
