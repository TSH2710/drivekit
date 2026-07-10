import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export interface ShopifyProduct {
  id: number
  title: string
  handle: string
  body_html: string
  vendor: string
  product_type: string
  tags: string
  status: string
  images: Array<{
    id: number
    src: string
    alt: string | null
    position: number
    width: number
    height: number
  }>
  variants: Array<{
    id: number
    title: string
    price: string
    compare_at_price: string | null
    option1: string | null
    option2: string | null
    option3: string | null
    inventory_quantity: number
    inventory_management: string | null
    inventory_policy: string
    image_id: number | null
    sku: string | null
    grams: number
    weight: number
    weight_unit: string
  }>
  options: Array<{
    id: number
    name: string
    position: number
    values: string[]
  }>
}

const CACHE_DIR = './data'
const TOKEN_CACHE_FILE = `${CACHE_DIR}/shopify-token.json`

export const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN || ''
export let SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || ''
export const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || ''
export const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || ''
export const SHOPIFY_API = `https://${SHOPIFY_STORE}/admin/api/2024-10`

export const SHOPIFY_SCOPES = 'read_products,write_products,read_inventory,write_inventory,read_content,write_content,read_orders,write_orders,read_fulfillments,write_fulfillments'

export interface TokenCache {
  accessToken: string
  expiresAt: number
  scope: string
}

export function readTokenCache(): TokenCache | null {
  if (!existsSync(TOKEN_CACHE_FILE)) return null
  try {
    return JSON.parse(readFileSync(TOKEN_CACHE_FILE, 'utf-8'))
  } catch { return null }
}

export function writeTokenCache(data: TokenCache) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(data, null, 2))
}

export function getActiveToken(): string {
  const cached = readTokenCache()
  if (cached) {
    SHOPIFY_TOKEN = cached.accessToken
    return cached.accessToken
  }
  if (SHOPIFY_TOKEN) return SHOPIFY_TOKEN
  return ''
}

export async function validateCurrentToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/2024-10/shop.json`, {
      headers: { 'X-Shopify-Access-Token': token },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function refreshAccessToken(): Promise<string> {
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN || ''
  if (envToken && await validateCurrentToken(envToken)) {
    const cache: TokenCache = { accessToken: envToken, expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, scope: 'validated' }
    writeTokenCache(cache)
    SHOPIFY_TOKEN = envToken
    console.log('[shopify] Env token validated and cached')
    return envToken
  }
  const cached = readTokenCache()
  if (cached && await validateCurrentToken(cached.accessToken)) {
    SHOPIFY_TOKEN = cached.accessToken
    return cached.accessToken
  }
  throw new Error('Shopify token is invalid. Re-authorize at /api/shopify/oauth/authorize')
}

export async function ensureValidToken(): Promise<string> {
  const cached = readTokenCache()
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken
  }
  try {
    return await refreshAccessToken()
  } catch {
    return getActiveToken()
  }
}

export async function shopifyFetch(path: string): Promise<any> {
  if (!SHOPIFY_STORE) throw new Error('Shopify store not configured')
  const token = await ensureValidToken()
  if (!token) throw new Error('Shopify not configured — no access token available')
  const res = await fetch(`${SHOPIFY_API}${path}`, {
    headers: { 'X-Shopify-Access-Token': token },
  })
  if (!res.ok) throw new Error(`Shopify API ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function shopifyApiPut(path: string, body: any): Promise<any> {
  if (!SHOPIFY_STORE) throw new Error('Shopify store not configured')
  const token = await ensureValidToken()
  if (!token) throw new Error('Shopify not configured — no access token available')
  const res = await fetch(`${SHOPIFY_API}${path}`, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Shopify PUT ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function fetchAllShopifyProducts(): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = []
  let lastId: number | undefined
  while (true) {
    const sinceParam = lastId ? `&since_id=${lastId}` : ''
    const data = await shopifyFetch(`/products.json?limit=250${sinceParam}`)
    const products = data.products ?? []
    allProducts.push(...products)
    if (products.length < 250) break
    lastId = products[products.length - 1].id
  }
  return allProducts
}
