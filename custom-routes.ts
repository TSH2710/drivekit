// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2026 Shogo Technologies, Inc.
/**
 * Custom API Routes
 *
 * This file is the editable surface for custom backend logic that
 * doesn't fit the auto-generated CRUD model (per-model GET/POST/PATCH/
 * DELETE under `/api/<model>s`). Anything you mount on the exported
 * Hono app shows up at `/api/...` alongside the generated CRUD routes.
 */

import { Hono } from 'hono'
import { prisma } from './src/lib/db'
import { randomBytes } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import {
  SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_API, SHOPIFY_SCOPES,
  ensureValidToken, shopifyFetch, shopifyApiPut, fetchAllShopifyProducts,
  readTokenCache, writeTokenCache, refreshAccessToken, validateCurrentToken,
} from './src/lib/shopify-helpers'

import {
  emailHtmlWrapper, sendEmail, getResendConfig, getSmtpConfig, env,
} from './src/lib/email-helpers'

import {
  hashPassword, generateToken, generateSixDigitCode, cleanExpiredSessions,
  getSessionUser, setSession, deleteSession, pendingSignups, CODE_EXPIRY_MS, SESSION_MAX_AGE_MS,
} from './src/lib/auth-helpers'

import { requireAdminMiddleware, optionalAuth } from './src/lib/admin-middleware'

import {
  CACHE_FILE, readKnownProducts, writeKnownProducts, markProductsAsKnown,
  getNextBatchTag, readCache, writeCache, fetchAndCacheProducts,
  shapeProduct, isSummerProduct, autoGenerateProductImage,
} from './src/lib/product-cache'

const app = new Hono()

// ── Shopify Products ──────────────────────────────────────────

app.get('/shopify/sync', requireAdminMiddleware, async (c) => {
  try {
    const rawProducts = await fetchAllShopifyProducts()
    const shaped = rawProducts.filter((p) => p.status === 'active').map(shapeProduct)
    writeCache(shaped)

    const known = readKnownProducts()
    const knownSet = new Set(known.knownIds)
    const activeRaw = rawProducts.filter(p => p.status === 'active')
    const newProducts = activeRaw.filter(p => !knownSet.has(p.id))

    const generatedImages: string[] = []

    if (newProducts.length > 0) {
      console.log(`[sync] Found ${newProducts.length} new products!`)
      const nextBatchTag = getNextBatchTag(newProducts.length)
      for (const p of newProducts) {
        try {
          const titleLower = (p.title || '').toLowerCase()
          const descLower = (p.body_html || '').toLowerCase()
          const combined = `${titleLower} ${descLower}`
          const tags: string[] = []
          tags.push(nextBatchTag)
          if (isSummerProduct({ title: p.title, body_html: p.body_html })) tags.push('summer')

          await shopifyApiPut(`/products/${p.id}.json`, {
            product: { vendor: 'DriveKit', tags: tags.join(', ') },
          })
          console.log(`[sync] Tagged "${p.title}" as ${nextBatchTag}${tags.includes('summer') ? ' +summer' : ''}`)
        } catch (tagErr: any) {
          console.error(`[sync] Failed to tag product ${p.id}:`, tagErr.message)
        }
      }

      for (let i = 0; i < newProducts.length; i += 3) {
        const batch = newProducts.slice(i, i + 3)
        const results = await Promise.allSettled(batch.map(p => autoGenerateProductImage(p)))
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) generatedImages.push(r.value)
        }
      }

      const knownData = readKnownProducts()
      const batchNum = parseInt(nextBatchTag.replace('Batch', '')) || 3
      writeKnownProducts({
        ...knownData,
        knownIds: [...new Set([...knownData.knownIds, ...activeRaw.map(p => p.id)])],
        lastSyncAt: new Date().toISOString(),
        currentBatch: batchNum,
      })
    } else {
      markProductsAsKnown(activeRaw.map(p => p.id))
    }

    console.log(`[sync] Synced ${shaped.length} products, ${newProducts.length} new, ${generatedImages.length} images`)
    return c.json({
      synced: true, count: shaped.length, newCount: newProducts.length,
      newProductTitles: newProducts.map(p => p.title),
      generatedImages, products: shaped,
    })
  } catch (err: any) {
    console.error('[sync] Error:', err)
    return c.json({ error: err.message ?? 'Sync failed' }, 500)
  }
})

app.get('/shopify/products', async (c) => {
  try {
    if (existsSync(CACHE_FILE)) {
      const raw = readFileSync(CACHE_FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (data.products?.length > 0) {
        const age = Date.now() - new Date(data.syncedAt).getTime()
        if (age >= 5 * 60 * 1000) {
          fetchAndCacheProducts(fetchAllShopifyProducts).catch(() => {})
        }
        const known = readKnownProducts()
        const lastSync = known.lastSyncAt ? new Date(known.lastSyncAt).getTime() : 0
        const products = data.products.map((p: any) => ({
          ...p,
          isNew: known.knownIds.length > 0 && !known.knownIds.includes(p.id) && lastSync > 0,
        }))
        return c.json({ products, source: age < 5 * 60 * 1000 ? 'cache' : 'cache-stale', syncedAt: data.syncedAt })
      }
    }
  } catch {}

  try {
    const rawProducts = await fetchAllShopifyProducts()
    const products = rawProducts.filter((p) => p.status === 'active').map(shapeProduct)
    writeCache(products)
    return c.json({ products, source: 'live' })
  } catch {}

  return c.json({ products: [], error: 'No products available' }, 503)
})

app.get('/shopify/products/:handle', async (c) => {
  const handle = c.req.param('handle')
  const cached = readCache()
  if (cached) {
    const product = cached.products.find((p) => p.handle === handle)
    if (product) return c.json({ product })
  }
  try {
    const rawProducts = await fetchAllShopifyProducts()
    const found = rawProducts.find((p) => p.handle === handle)
    if (found) return c.json({ product: shapeProduct(found) })
  } catch {}
  return c.json({ error: 'Product not found' }, 404)
})

app.get('/shopify/checkout', async (c) => {
  const cartParam = c.req.query('cart')
  const promoCode = c.req.query('promo')
  if (!cartParam) return c.json({ error: 'Missing cart parameter' }, 400)

  try {
    const cart = JSON.parse(cartParam) as Array<{ variantId: number; quantity: number }>
    if (!Array.isArray(cart) || cart.length === 0) return c.json({ error: 'Cart must be a non-empty array' }, 400)

    const domain = SHOPIFY_STORE
    if (!domain) return c.json({ error: 'Shopify store not configured' }, 502)

    const items = cart.filter((item) => item.variantId && item.quantity > 0)
      .map((item) => `${item.variantId}:${item.quantity}`).join(',')
    if (!items) return c.json({ error: 'No valid items in cart' }, 400)

    let url = `https://${domain}/cart/${items}`
    if (promoCode) url += `?discount=${encodeURIComponent(promoCode)}`
    return c.json({ url })
  } catch {
    return c.json({ error: 'Failed to build checkout URL' }, 500)
  }
})

app.get('/shopify/shop', async (c) => {
  try {
    const data = await shopifyFetch('/shop.json')
    const shop = (data?.shop ?? {}) as Record<string, unknown>
    return c.json({
      name: shop.name, domain: shop.domain, currency: shop.currency,
      country: shop.country_name, owner: shop.shop_owner, phone: shop.phone, email: shop.email,
    })
  } catch (err: any) {
    return c.json({ error: err.message ?? 'Failed to fetch shop details' }, 502)
  }
})

// ── Shopify Token Management ──────────────────────────────────

app.get('/shopify/token/refresh', requireAdminMiddleware, async (c) => {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    return c.json({ error: 'OAuth credentials not configured in .env' }, 400)
  }
  try {
    const token = await refreshAccessToken()
    return c.json({ ok: true, expires_in: 86399, token_prefix: token.slice(0, 10) + '...' })
  } catch (err: any) {
    return c.json({ error: err.message ?? 'Refresh failed' }, 500)
  }
})

app.get('/shopify/token/status', requireAdminMiddleware, async (c) => {
  const cached = readTokenCache()
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN || ''
  return c.json({
    hasEnvToken: !!envToken, hasCachedToken: !!cached,
    cachedExpiresAt: cached?.expiresAt ? new Date(cached.expiresAt).toISOString() : null,
    cachedExpired: cached ? cached.expiresAt <= Date.now() : null,
    clientIdConfigured: !!SHOPIFY_CLIENT_ID, secretConfigured: !!SHOPIFY_CLIENT_SECRET,
    store: SHOPIFY_STORE,
  })
})

// ── Shopify OAuth ─────────────────────────────────────────────

app.get('/shopify/oauth/authorize', async (c) => {
  if (!SHOPIFY_CLIENT_ID) return c.json({ error: 'SHOPIFY_CLIENT_ID not set' }, 400)
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || `${c.req.header('x-forwarded-proto') || 'https'}://${c.req.header('host')}/api/shopify/oauth/callback`
  const authUrl = `https://${SHOPIFY_STORE}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${encodeURIComponent(SHOPIFY_SCOPES)}&redirect_uri=${encodeURIComponent(redirectUri)}`
  return c.redirect(authUrl)
})

app.get('/shopify/oauth/callback', async (c) => {
  const code = c.req.query('code')
  const hmac = c.req.query('hmac')
  if (!code) return c.json({ error: 'Missing authorization code' }, 400)

  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || `${c.req.header('x-forwarded-proto') || 'https'}://${c.req.header('host')}/api/shopify/oauth/callback`

  try {
    const res = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, code, redirect_uri: redirectUri }),
    })

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await res.text()
      console.error('[shopify-oauth] Non-JSON response from Shopify:', res.status, text.slice(0, 200))
      return c.json({ error: `Shopify returned an error (HTTP ${res.status}). The authorization code may have already been used. Please try again.`, status: res.status }, 402)
    }

    const data = await res.json() as { access_token?: string; scope?: string; error?: string }
    if (!data.access_token) return c.json({ error: data.error ?? 'Token exchange failed', details: data }, 400)

    writeTokenCache({ accessToken: data.access_token, expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, scope: data.scope ?? '' })

    lastHealthResult = { ok: true, checkedAt: new Date().toISOString(), source: 'oauth-callback', message: 'Shopify token refreshed successfully' }
    lastHealthCheck = Date.now()

    console.log('[shopify-oauth] Token received and cached! Scopes:', data.scope)
    return c.json({ ok: true, message: 'Shopify connected! Token saved and validated.', scope: data.scope })
  } catch (err: any) {
    console.error('[shopify-oauth] Callback error:', err.message)
    return c.json({ error: err.message ?? 'OAuth callback failed' }, 500)
  }
})

app.post('/shopify/oauth/exchange', async (c) => {
  const body = await c.req.json<{ code?: string }>()
  const code = body.code?.trim()
  if (!code) return c.json({ error: 'Missing "code" parameter' }, 400)
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    return c.json({ error: 'OAuth credentials not configured' }, 400)
  }

  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || `${c.req.header('x-forwarded-proto') || 'https'}://${c.req.header('host')}/api/shopify/oauth/callback`

  try {
    const res = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, code, redirect_uri: redirectUri }),
    })
    const data = await res.json() as { access_token?: string; scope?: string; error?: string }
    if (!data.access_token) return c.json({ error: data.error ?? 'Token exchange failed', details: data }, 400)

    writeTokenCache({ accessToken: data.access_token, expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, scope: data.scope ?? '' })
    console.log('[shopify-oauth] Manual exchange succeeded! Scopes:', data.scope)
    return c.json({ ok: true, message: 'Shopify connected! Permanent token saved.', scope: data.scope })
  } catch (err: any) {
    return c.json({ error: err.message ?? 'Token exchange failed' }, 500)
  }
})

app.get('/shopify/oauth/setup', async (c) => {
  if (!SHOPIFY_CLIENT_ID) return c.json({ error: 'SHOPIFY_CLIENT_ID not set' }, 400)
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || `${c.req.header('x-forwarded-proto') || 'https'}://${c.req.header('host')}/api/shopify/oauth/callback`
  const authUrl = `https://${SHOPIFY_STORE}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${encodeURIComponent(SHOPIFY_SCOPES)}&redirect_uri=${encodeURIComponent(redirectUri)}`
  return c.json({
    step1: `Visit this URL in your browser to approve the app:\n${authUrl}`,
    step2: 'After approving, Shopify will redirect you with the authorization code in the URL.',
    step3: `The callback at ${redirectUri} will automatically exchange the code and save the token.`,
    authUrl, redirectUri,
  })
})

// ── Token Health Check ────────────────────────────────────────

let lastHealthCheck = 0
let lastHealthResult: { ok: boolean; checkedAt: string; source: string; message: string } | null = null
const HEALTH_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours

app.get('/shopify/token-status', async (c) => {
  const now = Date.now()
  if (lastHealthResult && now - lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) {
    return c.json(lastHealthResult)
  }

  const envToken = process.env.SHOPIFY_ACCESS_TOKEN || ''
  const cached = readTokenCache()

  let tokenToCheck = envToken
  let source = 'env'

  if (cached && cached.accessToken !== envToken) {
    const cachedValid = await validateCurrentToken(cached.accessToken)
    if (cachedValid) {
      tokenToCheck = cached.accessToken
      source = 'cache'
    }
  }

  if (!tokenToCheck) {
    lastHealthResult = { ok: false, checkedAt: new Date().toISOString(), source: 'none', message: 'No Shopify token configured. Re-authorize at /api/shopify/oauth/authorize' }
    lastHealthCheck = now
    return c.json(lastHealthResult)
  }

  const valid = await validateCurrentToken(tokenToCheck)
  lastHealthCheck = now

  if (valid) {
    lastHealthResult = { ok: true, checkedAt: new Date().toISOString(), source, message: 'Shopify token is valid' }
  } else {
    lastHealthResult = { ok: false, checkedAt: new Date().toISOString(), source, message: 'Shopify token is invalid. Re-authorize at /api/shopify/oauth/authorize' }
  }

  return c.json(lastHealthResult)
})

// ── Auto-Reauth ───────────────────────────────────────────────
// Checks token health, returns re-auth URL if invalid

app.get('/shopify/reauthorize', async (c) => {
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN || ''
  const cached = readTokenCache()
  const tokenToCheck = envToken || cached?.accessToken || ''

  if (tokenToCheck && await validateCurrentToken(tokenToCheck)) {
    return c.json({ ok: true, message: 'Token is still valid — no re-authorization needed' })
  }

  if (!SHOPIFY_CLIENT_ID) return c.json({ error: 'SHOPIFY_CLIENT_ID not set — cannot re-authorize' }, 400)
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || `${c.req.header('x-forwarded-proto') || 'https'}://${c.req.header('host')}/api/shopify/oauth/callback`
  const authUrl = `https://${SHOPIFY_STORE}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${encodeURIComponent(SHOPIFY_SCOPES)}&redirect_uri=${encodeURIComponent(redirectUri)}`

  return c.json({
    ok: false,
    message: 'Token is invalid or expired. Redirecting to Shopify for re-authorization.',
    authUrl,
    redirectUri,
  })
})

// ── Background Health Check (runs on server start) ────────────
;(async () => {
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN || ''
  if (!envToken) {
    console.log('[shopify-health] No token configured — skipping initial check')
    return
  }

  const valid = await validateCurrentToken(envToken)
  if (valid) {
    const cache = { accessToken: envToken, expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, scope: 'validated' }
    writeTokenCache(cache)
    lastHealthResult = { ok: true, checkedAt: new Date().toISOString(), source: 'startup', message: 'Shopify token validated on startup' }
    console.log('[shopify-health] ✅ Token validated on startup')
  } else {
    lastHealthResult = { ok: false, checkedAt: new Date().toISOString(), source: 'startup', message: 'Token invalid — re-authorize at /api/shopify/oauth/authorize' }
    console.log('[shopify-health] ❌ Token invalid on startup — re-authorization required')
  }
  lastHealthCheck = Date.now()

  setInterval(async () => {
    const token = process.env.SHOPIFY_ACCESS_TOKEN || readTokenCache()?.accessToken || ''
    if (!token) return
    const ok = await validateCurrentToken(token)
    lastHealthCheck = Date.now()
    if (ok) {
      lastHealthResult = { ok: true, checkedAt: new Date().toISOString(), source: 'periodic', message: 'Shopify token is valid' }
    } else {
      lastHealthResult = { ok: false, checkedAt: new Date().toISOString(), source: 'periodic', message: 'Token expired — re-authorize at /api/shopify/oauth/authorize' }
      console.log('[shopify-health] ⚠️ Token expired during periodic check — re-authorization needed')
    }
  }, HEALTH_CHECK_INTERVAL_MS)
})()

// ── Waitlist ──────────────────────────────────────────────────

app.post('/waitlist', async (c) => {
  const body = await c.req.json<{ email?: string; productId?: string; productTitle?: string }>()
  const email = body.email?.trim().toLowerCase()
  const productId = body.productId?.trim()
  const productTitle = body.productTitle?.trim()

  if (!email || !productId || !productTitle) return c.json({ error: 'Email, productId, and productTitle are required' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Invalid email address' }, 400)

  try {
    const entry = await prisma.waitlistEntry.upsert({
      where: { email_productId: { email, productId } },
      update: { productTitle },
      create: { email, productId, productTitle },
    })
    const count = await prisma.waitlistEntry.count({ where: { productId } })
    return c.json({ ok: true, entry, waitlistCount: count })
  } catch {
    return c.json({ error: 'Failed to join waitlist' }, 500)
  }
})

app.get('/waitlist/:productId', async (c) => {
  const productId = c.req.param('productId')
  try {
    const count = await prisma.waitlistEntry.count({ where: { productId } })
    return c.json({ productId, count })
  } catch {
    return c.json({ productId, count: 0 })
  }
})

// ── Auth ──────────────────────────────────────────────────────

app.post('/auth/signup', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string; emailOptIn?: boolean }>()
  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const name = body.name?.trim() || null
  const emailOptIn = body.emailOptIn !== false

  if (!email || !password) return c.json({ error: 'Email and password are required' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Invalid email address' }, 400)
  if (password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return c.json({ error: 'An account with this email already exists' }, 409)

  const user = await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), name },
  })

  if (emailOptIn === false) {
    await prisma.$executeRaw`UPDATE users SET email_opt_in = 0 WHERE id = ${user.id}`
  }

  const token = generateToken()
  setSession(token, user.id, user.email, user.role)

  const verifyToken = randomBytes(32).toString('hex')
  await prisma.$executeRaw`UPDATE users SET verification_token = ${verifyToken} WHERE id = ${user.id}`
  const verifyUrl = `/api/auth/verify-email?token=${verifyToken}&email=${encodeURIComponent(user.email)}`
  const verifyHtml = emailHtmlWrapper('Verify Your Email', `
    <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">Verify your email address ✉️</h2>
    <p style="color:#ccc;font-size:14px;line-height:1.6;">Click below to verify your DriveKit account email.</p>
    <p style="margin-top:16px;"><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Verify My Email</a></p>
    <p style="color:#888;font-size:12px;margin-top:24px;">This link expires in 24 hours. If you didn't create a DriveKit account, ignore this email.</p>
  `)
  sendEmail(user.email, 'Verify your DriveKit email ✉️', verifyHtml, 'verification').catch(() => {})

  if (emailOptIn !== false) {
    const welcomeHtml = emailHtmlWrapper('Welcome to DriveKit', `
      <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">Welcome to DriveKit${name ? ', ' + name : ''}! 🎉</h2>
      <p style="color:#ccc;font-size:14px;line-height:1.6;">You're now part of the DriveKit family.</p>
      <ul style="color:#ccc;font-size:14px;line-height:2;">
        <li>🏎️ Exclusive deals and early access</li>
        <li>📦 Order tracking and account management</li>
        <li>⭐ Reviews and recommendations</li>
      </ul>
      <p style="margin-top:16px;"><a href="https://drivekit.com" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Shop Now</a></p>
    `)
    sendEmail(user.email, 'Welcome to DriveKit! 🎉', welcomeHtml, 'welcome').catch(() => {})
    prisma.newsletterSubscriber.upsert({
      where: { email: user.email },
      update: { userId: user.id, name: user.name, unsubscribed: false, unsubscribedAt: null },
      create: { email: user.email, userId: user.id, name: user.name, source: 'signup' },
    }).catch(() => {})
  }

  return c.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

// ── Signup with Email Verification Code ───────────────────────

app.post('/auth/request-code', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string; emailOptIn?: boolean }>()
  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const name = body.name?.trim() || null
  const emailOptIn = body.emailOptIn !== false

  if (!email || !password) return c.json({ error: 'Email and password are required' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Invalid email address' }, 400)
  if (password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return c.json({ error: 'An account with this email already exists' }, 409)

  const code = generateSixDigitCode()
  pendingSignups.set(email, {
    code, email, passwordHash: hashPassword(password), name, emailOptIn,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
  })

  const codeHtml = emailHtmlWrapper('Your Verification Code', `
    <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">Verify your email ✉️</h2>
    <p style="color:#ccc;font-size:14px;line-height:1.6;">Use this code to complete your DriveKit account setup:</p>
    <div style="background:#222;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
      <span style="color:#fff;font-size:36px;font-weight:bold;letter-spacing:10px;font-family:monospace;">${code}</span>
    </div>
    <p style="color:#888;font-size:12px;margin-top:16px;">This code expires in 10 minutes.</p>
  `)

  const result = await sendEmail(email, 'Your DriveKit verification code 🔐', codeHtml, 'verification-code')
  if (result.ok) {
    console.log(`[auth] Verification code sent to ${email}: ${code}`)
    return c.json({ ok: true, message: 'Verification code sent to your email', email })
  }
  return c.json({ ok: false, error: result.error ?? 'Failed to send verification code' }, 500)
})

app.post('/auth/confirm-signup', async (c) => {
  const body = await c.req.json<{ email?: string; code?: string }>()
  const email = body.email?.trim().toLowerCase()
  const code = body.code?.trim()

  if (!email || !code) return c.json({ error: 'Email and code are required' }, 400)

  const pending = pendingSignups.get(email)
  if (!pending) return c.json({ error: 'No pending signup found for this email. Please request a new code.' }, 404)
  if (Date.now() > pending.expiresAt) { pendingSignups.delete(email); return c.json({ error: 'This code has expired. Please request a new one.' }, 410) }
  if (pending.code !== code) return c.json({ error: 'Invalid verification code. Please try again.' }, 400)

  const user = await prisma.user.create({
    data: { email, passwordHash: pending.passwordHash, name: pending.name },
  })

  if (pending.emailOptIn === false) {
    await prisma.$executeRaw`UPDATE users SET email_opt_in = 0 WHERE id = ${user.id}`
  }

  pendingSignups.delete(email)

  const token = generateToken()
  setSession(token, user.id, user.email, user.role)

  const verifyToken = randomBytes(32).toString('hex')
  await prisma.$executeRaw`UPDATE users SET verification_token = ${verifyToken} WHERE id = ${user.id}`
  const verifyUrl = `/api/auth/verify-email?token=${verifyToken}&email=${encodeURIComponent(user.email)}`
  const verifyHtml = emailHtmlWrapper('Verify Your Email', `
    <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">Verify your email address ✉️</h2>
    <p style="color:#ccc;font-size:14px;line-height:1.6;">Click below to verify your DriveKit account email.</p>
    <p style="margin-top:16px;"><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Verify My Email</a></p>
  `)
  sendEmail(user.email, 'Verify your DriveKit email ✉️', verifyHtml, 'verification').catch(() => {})

  if (pending.emailOptIn !== false) {
    const welcomeHtml = emailHtmlWrapper('Welcome to DriveKit', `
      <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">Welcome to DriveKit${pending.name ? ', ' + pending.name : ''}! 🎉</h2>
      <p style="color:#ccc;font-size:14px;line-height:1.6;">You're now part of the DriveKit family.</p>
    `)
    sendEmail(user.email, 'Welcome to DriveKit! 🎉', welcomeHtml, 'welcome').catch(() => {})
    prisma.newsletterSubscriber.upsert({
      where: { email: user.email },
      update: { userId: user.id, name: user.name, unsubscribed: false, unsubscribedAt: null },
      create: { email: user.email, userId: user.id, name: user.name, source: 'signup' },
    }).catch(() => {})
  }

  return c.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

app.post('/auth/signin', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>()
  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !password) return c.json({ error: 'Email and password are required' }, 400)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.passwordHash !== hashPassword(password)) return c.json({ error: 'Invalid email or password' }, 401)

  const token = generateToken()
  setSession(token, user.id, user.email, user.role)

  return c.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

app.get('/auth/me', async (c) => {
  const user = getSessionUser(c)
  if (!user) return c.json({ error: 'Not authenticated' }, 401)

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } })
  if (!dbUser) { deleteSession(c.req.header('Authorization')?.replace('Bearer ', '') ?? ''); return c.json({ error: 'User not found' }, 401) }

  return c.json({ ok: true, user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role } })
})

app.post('/auth/signout', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (token) deleteSession(token)
  return c.json({ ok: true })
})

// ── Admin Routes ──────────────────────────────────────────────

app.get('/admin/stats', requireAdminMiddleware, async (c) => {
  const [userCount, orderCount, totalRevenue, waitlistCount] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { total: true } }),
    prisma.waitlistEntry.count(),
  ])
  const recentOrders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { items: true } })
  const recentUsers = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, email: true, name: true, role: true, createdAt: true } })

  return c.json({ userCount, orderCount, totalRevenue: totalRevenue._sum.total ?? 0, waitlistCount, recentOrders, recentUsers })
})

app.get('/admin/users', requireAdminMiddleware, async (c) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true, _count: { select: { orders: true } } },
  })
  return c.json({ users })
})

app.patch('/admin/users/:id/role', requireAdminMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ role?: string }>()
  if (!body.role || !['OWNER', 'ADMIN', 'CUSTOMER'].includes(body.role)) return c.json({ error: 'Invalid role' }, 400)
  const user = await prisma.user.update({ where: { id }, data: { role: body.role }, select: { id: true, email: true, name: true, role: true } })
  return c.json({ ok: true, user })
})

app.delete('/admin/orders/:id', requireAdminMiddleware, async (c) => {
  const id = c.req.param('id')
  try {
    await prisma.orderItem.deleteMany({ where: { orderId: id } })
    await prisma.order.delete({ where: { id } })
    return c.json({ ok: true })
  } catch (err: any) {
    return c.json({ error: err.message ?? 'Failed to delete order' }, 500)
  }
})

app.delete('/admin/orders/fake', requireAdminMiddleware, async (c) => {
  const fakeOrders = await prisma.order.findMany({ where: { shopifyOrderId: null }, select: { id: true } })
  if (fakeOrders.length === 0) return c.json({ ok: true, deleted: 0, message: 'No fake orders found' })
  const ids = fakeOrders.map(o => o.id)
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } })
  await prisma.order.deleteMany({ where: { id: { in: ids } } })
  return c.json({ ok: true, deleted: ids.length })
})

app.patch('/admin/orders/:id/status', requireAdminMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status?: string }>()
  if (!body.status || !['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(body.status)) return c.json({ error: 'Invalid status' }, 400)
  const order = await prisma.order.update({ where: { id }, data: { status: body.status }, select: { id: true, orderNumber: true, status: true } })
  return c.json({ ok: true, order })
})

app.get('/admin/orders', requireAdminMiddleware, async (c) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true, user: { select: { id: true, email: true, name: true } } },
  })
  return c.json({ orders })
})

// ── Shopify Webhook ───────────────────────────────────────────

function generateOrderNumber(): string {
  return `DK-${Math.floor(10000 + Math.random() * 90000)}`
}

app.post('/webhooks/shopify/orders', async (c) => {
  const topic = c.req.header('X-Shopify-Topic')
  if (topic !== 'orders/paid' && topic !== 'orders/fulfilled' && topic !== 'orders/cancelled') {
    return c.json({ ok: true, skipped: true })
  }

  const body = await c.req.json<any>()
  const shopifyOrderId = String(body.id)
  const shopifyOrderNumber = body.order_number ? `#${body.order_number}` : null

  const statusMap: Record<string, string> = {
    'orders/paid': 'confirmed', 'orders/fulfilled': 'shipped', 'orders/cancelled': 'cancelled',
  }
  const newStatus = statusMap[topic!] ?? 'confirmed'

  try {
    const existing = await prisma.order.findFirst({ where: { shopifyOrderId } })
    if (existing) {
      await prisma.order.update({ where: { id: existing.id }, data: { status: newStatus, shopifyOrderNum: shopifyOrderNumber } })
    } else if (topic === 'orders/paid') {
      const orderNumber = generateOrderNumber()
      const email = body.email ?? body.customer?.email ?? 'unknown@shopify.com'
      const total = parseFloat(body.total_price ?? '0')

      const order = await prisma.order.create({
        data: {
          orderNumber, email, status: 'confirmed', total, currency: body.currency ?? 'USD',
          shippingName: body.shipping_address ? `${body.shipping_address.first_name} ${body.shipping_address.last_name}` : null,
          shippingAddress1: body.shipping_address?.address1, shippingAddress2: body.shipping_address?.address2,
          shippingCity: body.shipping_address?.city, shippingState: body.shipping_address?.province_code,
          shippingZip: body.shipping_address?.zip, shippingCountry: body.shipping_address?.country_code,
          shopifyOrderId, shopifyOrderNum: shopifyOrderNumber,
        },
      })

      for (const item of (body.line_items ?? [])) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id, productId: String(item.product_id ?? ''),
            variantId: item.variant_id ? String(item.variant_id) : null,
            title: item.title ?? 'Unknown', variantTitle: item.variant_title ?? null,
            quantity: item.quantity ?? 1, price: parseFloat(item.price ?? '0'),
            total: parseFloat(item.price ?? '0') * (item.quantity ?? 1),
          },
        })
      }
    }
    return c.json({ ok: true })
  } catch (err) {
    console.error('[webhook] Error processing Shopify order:', err)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// ── Shopify Orders Import ──────────────────────────────────────

app.get('/shopify/orders', requireAdminMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') ?? '50')
    const status = c.req.query('status') ?? 'any'
    const sinceId = c.req.query('since_id') ?? ''
    let path = `/orders.json?limit=${Math.min(limit, 250)}&status=${status}`
    if (sinceId) path += `&since_id=${sinceId}`

    const data = await shopifyFetch(path)
    const orders = (data.orders ?? []).map((o: any) => ({
      id: o.id, order_number: o.order_number, name: o.name, email: o.email,
      total_price: o.total_price, subtotal_price: o.subtotal_price, total_tax: o.total_tax,
      currency: o.currency, financial_status: o.financial_status, fulfillment_status: o.fulfillment_status,
      created_at: o.created_at, updated_at: o.updated_at,
      line_items: (o.line_items ?? []).map((li: any) => ({
        id: li.id, title: li.title, variant_title: li.variant_title, quantity: li.quantity,
        price: li.price, product_id: li.product_id, variant_id: li.variant_id, sku: li.sku, vendor: li.vendor,
      })),
      shipping_address: o.shipping_address ? {
        name: o.shipping_address.name, address1: o.shipping_address.address1, address2: o.shipping_address.address2,
        city: o.shipping_address.city, province_code: o.shipping_address.province_code,
        zip: o.shipping_address.zip, country_code: o.shipping_address.country_code, phone: o.shipping_address.phone,
      } : null,
      customer: o.customer ? { id: o.customer.id, email: o.customer.email, first_name: o.customer.first_name, last_name: o.customer.last_name } : null,
    }))
    return c.json({ orders, count: orders.length })
  } catch (err: any) {
    return c.json({ error: err.message ?? 'Failed to fetch Shopify orders' }, 500)
  }
})

app.post('/shopify/orders/import', requireAdminMiddleware, async (c) => {
  try {
    const allOrders: any[] = []
    let lastId: number | undefined
    for (let pages = 0; pages < 10; pages++) {
      const sinceParam = lastId ? `&since_id=${lastId}` : ''
      const data = await shopifyFetch(`/orders.json?limit=250&status=any${sinceParam}`)
      const orders = data.orders ?? []
      allOrders.push(...orders)
      if (orders.length < 250) break
      lastId = orders[orders.length - 1].id
    }

    let imported = 0; let skipped = 0
    const financialMap: Record<string, string> = { paid: 'confirmed', pending: 'pending', refunded: 'refunded', partially_refunded: 'refunded', voided: 'cancelled', authorized: 'pending', partially_paid: 'processing' }
    const fulfillMap: Record<string, string> = { fulfilled: 'shipped', partial: 'processing', unfulfilled: 'pending', restocked: 'pending' }

    for (const o of allOrders) {
      const shopifyOrderId = String(o.id)
      if (await prisma.order.findFirst({ where: { shopifyOrderId } })) { skipped++; continue }

      const status = fulfillMap[o.fulfillment_status ?? ''] ?? financialMap[o.financial_status ?? ''] ?? 'pending'
      const orderNumber = `#${o.order_number}`

      const order = await prisma.order.create({
        data: {
          orderNumber, email: o.email ?? o.customer?.email ?? 'unknown@shopify.com', status,
          total: parseFloat(o.total_price ?? '0'), currency: o.currency ?? 'USD',
          shippingName: o.shipping_address ? `${o.shipping_address.first_name} ${o.shipping_address.last_name}` : null,
          shippingAddress1: o.shipping_address?.address1, shippingAddress2: o.shipping_address?.address2,
          shippingCity: o.shipping_address?.city, shippingState: o.shipping_address?.province_code,
          shippingZip: o.shipping_address?.zip, shippingCountry: o.shipping_address?.country_code,
          shopifyOrderId, shopifyOrderNum: orderNumber, promoCode: null, discount: 0,
        },
      })

      for (const li of (o.line_items ?? [])) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id, productId: String(li.product_id ?? ''),
            variantId: li.variant_id ? String(li.variant_id) : null,
            title: li.title ?? 'Unknown', variantTitle: li.variant_title ?? null,
            quantity: li.quantity ?? 1, price: parseFloat(li.price ?? '0'),
            total: parseFloat(li.price ?? '0') * (li.quantity ?? 1),
          },
        })
      }
      imported++
    }

    console.log(`[import] Imported ${imported} orders, skipped ${skipped} existing`)
    return c.json({ ok: true, imported, skipped, total: allOrders.length })
  } catch (err: any) {
    return c.json({ error: err.message ?? 'Import failed' }, 500)
  }
})

// ── Shopify Fulfillment ────────────────────────────────────────

app.post('/admin/orders/:id/fulfill', requireAdminMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ trackingNumber?: string; trackingCompany?: string; notifyCustomer?: boolean }>()

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
  if (!order) return c.json({ error: 'Order not found' }, 404)

  if (order.shopifyOrderId) {
    try {
      const shopifyOrder = await shopifyFetch(`/orders/${order.shopifyOrderId}.json`)
      const lineItems = (shopifyOrder.order?.line_items ?? []).map((li: any) => ({ id: li.id, quantity: li.quantity }))

      const fulfillRes = await fetch(`${SHOPIFY_API}/orders/${order.shopifyOrderId}/fulfillments.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': await ensureValidToken(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillment: {
            location_id: null, line_items: lineItems,
            notify_customer: body.notifyCustomer ?? true,
            tracking_number: body.trackingNumber || undefined,
            tracking_company: body.trackingCompany || undefined,
          },
        }),
      })

      if (!fulfillRes.ok) {
        const errBody = await fulfillRes.text()
        console.error('[fulfill] Shopify API error:', fulfillRes.status, errBody)
        return c.json({ error: `Shopify fulfillment failed (${fulfillRes.status})` }, 502)
      }
    } catch (err: any) {
      return c.json({ error: `Failed to sync fulfillment to Shopify: ${err.message}` }, 500)
    }
  }

  const updatedOrder = await prisma.order.update({ where: { id }, data: { status: 'shipped' }, include: { items: true } })
  return c.json({ ok: true, order: updatedOrder })
})

// ── Shopify Webhook Registration ────────────────────────────────

app.post('/shopify/webhooks/register', requireAdminMiddleware, async (c) => {
  const baseUrl = process.env.SHOPIFY_REDIRECT_URI?.replace(/\/api\/shopify\/oauth\/callback$/, '') ||
    `${c.req.header('x-forwarded-proto') || 'https'}://${c.req.header('host')}`
  const callbackUrl = `${baseUrl}/api/webhooks/shopify/orders`
  const topics = ['orders/paid', 'orders/fulfilled', 'orders/cancelled', 'orders/updated']
  const registered: string[] = []; const errors: string[] = []
  const token = await ensureValidToken()

  for (const topic of topics) {
    try {
      const res = await fetch(`${SHOPIFY_API}/webhooks.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook: { topic, address: callbackUrl, format: 'json' } }),
      })
      if (res.ok) registered.push(topic)
      else errors.push(`${topic}: ${await res.text()}`)
    } catch (err: any) { errors.push(`${topic}: ${err.message}`) }
  }

  return c.json({ ok: errors.length === 0, registered, errors })
})

app.get('/shopify/webhooks/list', requireAdminMiddleware, async (c) => {
  try {
    const data = await shopifyFetch('/webhooks.json')
    const webhooks = (data.webhooks ?? []).map((w: any) => ({ id: w.id, topic: w.topic, address: w.address, created_at: w.created_at, updated_at: w.updated_at }))
    return c.json({ webhooks })
  } catch (err: any) {
    return c.json({ error: err.message ?? 'Failed to list webhooks' }, 500)
  }
})

// ── Order Notifications ────────────────────────────────────────

app.post('/orders/:id/notify', requireAdminMiddleware, async (c) => {
  const id = c.req.param('id')
  const body: Record<string, unknown> = await c.req.json().catch(() => ({}))
  const notifyType = (body.type as string) ?? 'confirmation'

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
  if (!order) return c.json({ error: 'Order not found' }, 404)

  const resendConfig = getResendConfig()
  if (!resendConfig) return c.json({ ok: true, skipped: true, reason: 'Email not configured' })

  const subjectMap: Record<string, string> = {
    confirmation: `Order ${order.orderNumber} Confirmed — DriveKit`,
    shipped: `Your order ${order.orderNumber} has shipped! — DriveKit`,
    delivered: `Your order ${order.orderNumber} was delivered — DriveKit`,
    cancelled: `Order ${order.orderNumber} has been cancelled — DriveKit`,
  }

  const FROM_EMAIL = env('FROM_EMAIL') ?? 'orders@drivekit.com'
  const itemsList = order.items.map(i =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #333;">${i.title}${i.variantTitle && i.variantTitle !== 'Default Title' ? ` / ${i.variantTitle}` : ''}</td><td style="padding:8px 12px;border-bottom:1px solid #333;text-align:center;">${i.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #333;text-align:right;">$${i.total.toFixed(2)}</td></tr>`
  ).join('')

  const htmlBody = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#111;color:#fff;padding:32px;">
    <div style="max-width:480px;margin:0 auto;">
      <h1 style="color:#fff;font-size:24px;margin-bottom:4px;">DRIVE<span style="color:#dc2626;">KIT</span></h1>
      <p style="color:#888;font-size:14px;margin-top:16px;">Order ${order.orderNumber}</p>
      <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">${subjectMap[notifyType]?.replace(/.*— /, '') ?? 'Order Update'}</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <thead><tr style="border-bottom:2px solid #333;"><th style="padding:8px 12px;text-align:left;color:#888;">Item</th><th style="padding:8px 12px;text-align:center;color:#888;">Qty</th><th style="padding:8px 12px;text-align:right;color:#888;">Price</th></tr></thead>
        <tbody>${itemsList}</tbody>
      </table>
      <div style="border-top:2px solid #333;padding-top:12px;margin-top:12px;font-size:14px;">
        <p style="display:flex;justify-content:space-between;"><span style="color:#888;">Total</span><span style="font-weight:bold;">$${order.total.toFixed(2)}</span></p>
      </div>
    </div></body></html>`

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendConfig.apiKey)
    const fromAddress = FROM_EMAIL.includes('<') ? FROM_EMAIL : `DriveKit <${FROM_EMAIL}>`
    await resend.emails.send({ from: fromAddress, to: order.email, subject: subjectMap[notifyType] ?? `Order ${order.orderNumber} Update — DriveKit`, html: htmlBody })
    return c.json({ ok: true, sent: true, type: notifyType, to: order.email })
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500)
  }
})

// ── Public Order Lookup ──────────────────────────────────────

app.get('/track-order', async (c) => {
  const orderNumber = c.req.query('order_number')
  const email = c.req.query('email')
  if (!orderNumber || !email) return c.json({ error: 'Please provide both order number and email.' }, 400)

  const cleanOrderNum = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`
  const order = await prisma.order.findFirst({ where: { orderNumber: cleanOrderNum, email: email.toLowerCase().trim() }, include: { items: true } })
  if (!order) return c.json({ error: 'No order found with that number and email combination.' }, 404)

  const STATUS_ORDER: Record<string, number> = { pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4, cancelled: -1, refunded: -1 }
  const currentIdx = STATUS_ORDER[order.status] ?? 0

  return c.json({
    order: {
      orderNumber: order.orderNumber, status: order.status, total: order.total,
      currency: order.currency, createdAt: order.createdAt,
      items: order.items.map((i) => ({ title: i.title, variantTitle: i.variantTitle, quantity: i.quantity, price: i.price, total: i.total })),
      trackingSteps: [
        { key: 'pending', label: 'Order Placed', completed: currentIdx >= 0 },
        { key: 'confirmed', label: 'Confirmed', completed: currentIdx >= 1 },
        { key: 'processing', label: 'Processing', completed: currentIdx >= 2 },
        { key: 'shipped', label: 'Shipped', completed: currentIdx >= 3 },
        { key: 'delivered', label: 'Delivered', completed: currentIdx >= 4 },
      ],
      isCancelled: currentIdx < 0,
    },
  })
})

// ── Orders ────────────────────────────────────────────────────

app.post('/orders/place', optionalAuth, async (c) => {
  const sessionUser = c.get('user') ?? null
  const body = await c.req.json<{
    email?: string
    items?: Array<{ productId: string; variantId?: string; title: string; variantTitle?: string; quantity: number; price: number }>
    shipping?: { name: string; address1: string; address2?: string; city: string; state: string; zip: string; country: string }
    promoCode?: string
    discount?: number
    total?: number
  }>()

  if (!body.email || !body.items?.length || !body.total) return c.json({ error: 'Missing required fields' }, 400)

  let orderNumber = generateOrderNumber()
  while (await prisma.order.findUnique({ where: { orderNumber } })) orderNumber = generateOrderNumber()

  const order = await prisma.order.create({
    data: {
      orderNumber, userId: sessionUser?.userId ?? null, email: body.email, status: 'pending',
      total: body.total,
      shippingName: body.shipping?.name, shippingAddress1: body.shipping?.address1,
      shippingAddress2: body.shipping?.address2, shippingCity: body.shipping?.city,
      shippingState: body.shipping?.state, shippingZip: body.shipping?.zip, shippingCountry: body.shipping?.country,
      promoCode: body.promoCode, discount: body.discount ?? 0,
    },
  })

  for (const item of body.items) {
    await prisma.orderItem.create({
      data: {
        orderId: order.id, productId: item.productId, variantId: item.variantId,
        title: item.title, variantTitle: item.variantTitle, quantity: item.quantity,
        price: item.price, total: item.price * item.quantity,
      },
    })
  }

  const fullOrder = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } })

  if (fullOrder && fullOrder.email && !fullOrder.email.includes('unknown@')) {
    const items = (fullOrder as any).items ?? []
    const itemsList = items.map((i: any) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #333;">${i.title}${i.variantTitle && i.variantTitle !== 'Default Title' ? ` / ${i.variantTitle}` : ''}</td><td style="padding:8px 12px;border-bottom:1px solid #333;text-align:center;">${i.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #333;text-align:right;">$${i.total.toFixed(2)}</td></tr>`
    ).join('')
    const confirmHtml = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#111;color:#fff;padding:32px;">
      <div style="max-width:480px;margin:0 auto;">
        <h1 style="color:#fff;font-size:24px;margin-bottom:4px;">DRIVE<span style="color:#dc2626;">KIT</span></h1>
        <p style="color:#888;font-size:14px;margin-top:16px;">Order ${fullOrder.orderNumber}</p>
        <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">Order Confirmed ✅</h2>
        <p style="color:#ccc;font-size:14px;line-height:1.6;">Thank you for your purchase!</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
          <thead><tr style="border-bottom:2px solid #333;"><th style="padding:8px 12px;text-align:left;color:#888;">Item</th><th style="padding:8px 12px;text-align:center;color:#888;">Qty</th><th style="padding:8px 12px;text-align:right;color:#888;">Price</th></tr></thead>
          <tbody>${itemsList}</tbody>
        </table>
        <div style="border-top:2px solid #333;padding-top:12px;margin-top:12px;font-size:14px;">
          <p style="display:flex;justify-content:space-between;"><span style="color:#888;">Total</span><span style="font-weight:bold;">$${fullOrder.total.toFixed(2)}</span></p>
        </div>
      </div></body></html>`
    sendEmail(fullOrder.email, `Order ${fullOrder.orderNumber} Confirmed — DriveKit`, confirmHtml, 'order-confirmation').catch(() => {})
  }

  return c.json({ ok: true, order: { id: fullOrder!.id, orderNumber: fullOrder!.orderNumber, status: fullOrder!.status, total: fullOrder!.total } })
})

app.get('/my-orders', optionalAuth, async (c) => {
  const sessionUser = c.get('user')
  if (!sessionUser) return c.json({ orders: [] })
  const orders = await prisma.order.findMany({ where: { userId: sessionUser.userId }, orderBy: { createdAt: 'desc' }, include: { items: true } })
  return c.json({ orders })
})

app.get('/order/:orderNumber', optionalAuth, async (c) => {
  const orderNumber = c.req.param('orderNumber')
  const sessionUser = c.get('user') ?? null
  const order = await prisma.order.findUnique({
    where: { orderNumber }, include: { items: true, user: { select: { id: true, email: true, name: true } } },
  })
  if (!order) return c.json({ error: 'Order not found' }, 404)
  if (sessionUser && sessionUser.userId !== order.userId && sessionUser.role === 'CUSTOMER') return c.json({ error: 'Forbidden' }, 403)
  return c.json({ order })
})

// ─── Product Reviews ──────────────────────────────────────────

app.get('/reviews/product/:productId', async (c) => {
  const productId = c.req.param('productId')
  const reviews = await prisma.review.findMany({ where: { productId }, orderBy: { createdAt: 'desc' } })
  const count = reviews.length
  const avg = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0
  const distribution = [0, 0, 0, 0, 0]
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1]++ })
  return c.json({ reviews, count, average: Math.round(avg * 10) / 10, distribution })
})

app.post('/reviews/product/:productId', optionalAuth, async (c) => {
  const productId = c.req.param('productId')
  const body = await c.req.json()
  const { rating, title, body: reviewBody, displayName, email } = body

  if (!rating || rating < 1 || rating > 5) return c.json({ error: 'Rating must be between 1 and 5' }, 400)
  if (!displayName || !displayName.trim()) return c.json({ error: 'Name is required' }, 400)

  const sessionUser = c.get('user') ?? null
  let userId: string | null = sessionUser?.userId ?? null

  const review = await prisma.review.create({
    data: {
      productId: String(productId), userId,
      displayName: displayName.trim(), email: email || sessionUser?.email || null,
      rating: Number(rating), title: title?.trim() || null, body: reviewBody?.trim() || '', verified: false,
    },
  })

  if (userId) {
    const hasOrder = await prisma.order.findFirst({
      where: { userId, items: { some: { productId: String(productId) } }, status: { in: ['confirmed', 'shipped', 'delivered', 'fulfilled'] } },
    })
    if (hasOrder) { await prisma.review.update({ where: { id: review.id }, data: { verified: true } }); review.verified = true }
  }

  return c.json({ ok: true, data: review }, 201)
})

// ── Product Overrides (Admin) ─────────────────────────────────

app.get('/admin/products', requireAdminMiddleware, async (c) => {
  let products: any[] = []
  try {
    if (existsSync(CACHE_FILE)) {
      const raw = readFileSync(CACHE_FILE, 'utf-8')
      products = JSON.parse(raw).products ?? []
    }
  } catch {}
  if (products.length === 0) {
    try {
      const rawProducts = await fetchAllShopifyProducts()
      products = rawProducts.filter((p) => p.status === 'active').map(shapeProduct)
    } catch {}
  }

  const overrides = await prisma.productOverride.findMany()
  const overrideMap = new Map(overrides.map((o) => [o.shopifyId, o]))

  const merged = products.map((p) => {
    const o = overrideMap.get(String(p.id))
    if (!o) return p
    return {
      ...p,
      title: o.title ?? p.title, description: o.description ?? p.description,
      vendor: o.vendor ?? p.vendor, productType: o.productType ?? p.productType,
      tags: o.tags ? o.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : p.tags,
      hidden: o.hidden, minPrice: o.customPrice ?? p.minPrice,
      variants: p.variants.map((v: any) => ({
        ...v, price: o.customPrice ?? v.price, compareAtPrice: o.customCompareAt ?? v.compareAtPrice,
      })),
      hasOverride: !!o,
    }
  })

  return c.json({ products: merged, count: merged.length })
})

app.put('/admin/products/:id', requireAdminMiddleware, async (c) => {
  const shopifyId = c.req.param('id')
  const body = await c.req.json<{
    title?: string; description?: string; vendor?: string; productType?: string;
    tags?: string; hidden?: boolean; customPrice?: number | null; customCompareAt?: number | null
  }>()

  const data: Record<string, unknown> = {}
  for (const key of ['title', 'description', 'vendor', 'productType', 'tags', 'hidden', 'customPrice', 'customCompareAt'] as const) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const override = await prisma.productOverride.upsert({ where: { shopifyId }, update: data, create: { shopifyId, ...data } })
  return c.json({ ok: true, override })
})

app.delete('/admin/products/:id', requireAdminMiddleware, async (c) => {
  const shopifyId = c.req.param('id')
  try { await prisma.productOverride.delete({ where: { shopifyId } }) } catch {}
  return c.json({ ok: true })
})

// ── Site Content (CMS) ──────────────────────────────────────────

const DEFAULT_SITE_CONTENT: Record<string, string> = {
  'banner.text': '🚚 FREE 2-DAY SHIPPING on orders over $99 · Use code DRIVE20 for 20% off your first order',
  'hero.badge': 'Performance. Precision. Power.',
  'hero.headline': 'BUILT FOR\nSERIOUS\nDRIVERS.',
  'hero.description': 'Premium car accessories for every ride.',
  'hero.cta1': 'Shop Now', 'hero.cta2': 'Browse Catalog',
  'why.badge': 'Why DriveKit', 'why.headline': 'The DriveKit Difference',
  'footer.copyright': '© 2026 DriveKit. All rights reserved.',
}

app.get('/site-content', async (c) => {
  try {
    const rows = await prisma.siteContent.findMany()
    const content: Record<string, string> = { ...DEFAULT_SITE_CONTENT }
    for (const row of rows) content[row.key] = row.value
    return c.json({ content })
  } catch {
    return c.json({ content: DEFAULT_SITE_CONTENT })
  }
})

app.put('/site-content', requireAdminMiddleware, async (c) => {
  const body = await c.req.json<{ entries?: Array<{ key: string; value: string }> }>()
  if (!body.entries?.length) return c.json({ error: 'No entries provided' }, 400)

  const updated: string[] = []
  for (const entry of body.entries) {
    const key = entry.key?.trim(); const value = entry.value?.trim()
    if (!key) continue
    await prisma.siteContent.upsert({ where: { key }, update: { value: value ?? '' }, create: { key, value: value ?? '' } })
    updated.push(key)
  }
  return c.json({ ok: true, updated })
})

// ── Generated Images ─────────────────────────────────────────

app.get('/generated-images/:filename', async (c) => {
  const filename = c.req.param('filename')
  const genDir = `${process.cwd()}/generated-products`
  const filePath = existsSync(`${genDir}/${filename}`) ? `${genDir}/${filename}` : `${process.cwd()}/${filename}`
  if (!existsSync(filePath)) return c.json({ error: 'File not found' }, 404)
  const data = readFileSync(filePath)
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'png'
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'
  return new Response(data, {
    headers: { 'Content-Type': mime, 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-cache' },
  })
})

// ── Higgsfield / Together Image Generation ─────────────────────

const HIGGSFIELD_KEY_ID = process.env.HIGGSFIELD_API_KEY_ID || ''
const HIGGSFIELD_SECRET = process.env.HIGGSFIELD_API_KEY_SECRET || ''
const HIGGSFIELD_API = 'https://platform.higgsfield.ai'
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || ''

let cachedStyles: any[] | null = null
let stylesCacheAt = 0

async function fetchHiggsfieldStyles() {
  if (cachedStyles && Date.now() - stylesCacheAt < 30 * 60 * 1000) return cachedStyles
  const res = await fetch(`${HIGGSFIELD_API}/v1/text2image/soul-styles`, {
    headers: { 'hf-api-key': HIGGSFIELD_KEY_ID, 'hf-secret': HIGGSFIELD_SECRET },
  })
  if (!res.ok) throw new Error(`Failed to fetch styles: ${res.status}`)
  cachedStyles = await res.json() as any[]
  stylesCacheAt = Date.now()
  return cachedStyles
}

async function higgsfieldGenerate(params: { prompt: string; style_id?: string; width_and_height?: string; quality?: string; batch_size?: number; seed?: number }): Promise<{ images: Array<{ url: string }>; job_id?: string }> {
  const body = {
    prompt: params.prompt, style_id: params.style_id || '1cb4b936-77bf-4f9a-9039-f3d349a4cdbe',
    width_and_height: params.width_and_height || '1536x1536', quality: params.quality || '720p',
    batch_size: params.batch_size || 1, seed: params.seed ?? Math.floor(Math.random() * 999999),
  }

  const res = await fetch(`${HIGGSFIELD_API}/v1/text2image/soul`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'hf-api-key': HIGGSFIELD_KEY_ID, 'hf-secret': HIGGSFIELD_SECRET },
    body: JSON.stringify({ params: body }),
  })

  const data = await res.json() as any
  if (!res.ok) throw new Error(data?.detail || data?.error || `Generation failed (${res.status})`)

  const images = (data?.images ?? data?.output?.images ?? data?.result?.images ?? []).map((img: any) => ({
    url: typeof img === 'string' ? img : img?.url || img?.image_url || '',
  })).filter((img: { url: string }) => img.url)

  if (images.length === 0 && data?.job_id) {
    const jobId = data.job_id
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`${HIGGSFIELD_API}/v1/jobs/${jobId}`, {
        headers: { 'hf-api-key': HIGGSFIELD_KEY_ID, 'hf-secret': HIGGSFIELD_SECRET },
      })
      if (!pollRes.ok) continue
      const pollData = await pollRes.json() as any
      const status = pollData?.status || pollData?.state
      if (status === 'completed' || status === 'succeeded') {
        const resultImages = (pollData?.images ?? pollData?.output?.images ?? pollData?.result?.images ?? []).map((img: any) => ({
          url: typeof img === 'string' ? img : img?.url || img?.image_url || '',
        })).filter((img: { url: string }) => img.url)
        if (resultImages.length > 0) return { images: resultImages, job_id: jobId }
        break
      }
      if (status === 'failed' || status === 'error') throw new Error(pollData?.error || 'Generation failed')
    }
  }

  return { images, job_id: data?.job_id }
}

async function togetherGenerate(params: { prompt: string; width?: number; height?: number; referenceImages?: string[] }): Promise<{ images: Array<{ url: string }>; model: string }> {
  if (!TOGETHER_API_KEY) throw new Error('Together API key not configured')
  const hasRef = params.referenceImages && params.referenceImages.length > 0

  const payload: Record<string, any> = {
    model: hasRef ? 'black-forest-labs/FLUX.2-pro' : 'black-forest-labs/FLUX.1-schnell',
    prompt: params.prompt, width: params.width ?? 1024, height: params.height ?? 1024, n: 1,
    response_format: 'b64_json',
  }
  if (!hasRef) payload.steps = 4
  if (hasRef) payload.reference_images = params.referenceImages

  const res = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOGETHER_API_KEY}` },
    body: JSON.stringify(payload),
  })

  const data = await res.json() as any
  if (!res.ok) throw new Error(data?.error?.message || data?.detail || `Together API failed (${res.status})`)

  const images = (data?.data ?? []).map((img: any) => {
    if (img.b64_json) return { url: `data:image/png;base64,${img.b64_json}` }
    return { url: img.url || '' }
  }).filter((img: { url: string }) => img.url)

  return { images, model: hasRef ? 'FLUX.2-pro' : 'FLUX.1-schnell' }
}

function generatePlaceholderSvg(prompt: string, width: number, height: number, seed: number): string {
  const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#0891b2']
  const pick = (i: number) => colors[(seed + i) % colors.length]
  const c1 = pick(0), c2 = pick(3), c3 = pick(5)
  const displayPrompt = prompt.split(/\s+/).slice(0, 6).join(' ') || prompt.slice(0, 40)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${c2};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${c3};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect x="${width * 0.08}" y="${height * 0.38}" width="${width * 0.84}" height="${height * 0.24}" rx="12" fill="rgba(0,0,0,0.5)" />
  <text x="${width / 2}" y="${height * 0.47}" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="${Math.max(16, Math.min(32, width / 28))}" font-weight="600">${displayPrompt.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
  <text x="${width / 2}" y="${height * 0.57}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="system-ui,sans-serif" font-size="${Math.max(12, Math.min(18, width / 45))}">AI Image Preview</text>
</svg>`
}

app.get('/higgsfield/styles', async (c) => {
  if (!HIGGSFIELD_KEY_ID || !HIGGSFIELD_SECRET) return c.json({ error: 'Higgsfield API credentials not configured' }, 503)
  try { return c.json({ styles: await fetchHiggsfieldStyles() }) }
  catch (err: any) { return c.json({ error: err.message ?? 'Failed to fetch styles' }, 500) }
})

app.post('/higgsfield/generate', async (c) => {
  const body = await c.req.json<{ prompt?: string; style_id?: string; width_and_height?: string; quality?: string; batch_size?: number; seed?: number; reference_images?: string[] }>()
  if (!body.prompt?.trim()) return c.json({ error: 'Prompt is required' }, 400)

  const prompt = body.prompt.trim()
  const seed = body.seed ?? Math.floor(Math.random() * 999999)
  const w = body.width_and_height ? parseInt(body.width_and_height.split('x')[0]) || 1024 : 1024
  const h = body.width_and_height ? parseInt(body.width_and_height.split('x')[1]) || 1024 : 1024

  if (HIGGSFIELD_KEY_ID && HIGGSFIELD_SECRET) {
    try {
      const result = await higgsfieldGenerate({ prompt, style_id: body.style_id, width_and_height: body.width_and_height, quality: body.quality, batch_size: body.batch_size, seed })
      if (result.images.length > 0) return c.json({ ok: true, images: result.images, job_id: result.job_id, provider: 'higgsfield' })
    } catch (err: any) {
      if (err.message?.includes('Not enough credits')) console.log('[generate] Higgsfield credits exhausted, trying Together AI')
      else console.log('[generate] Higgsfield error:', err.message)
    }
  }

  if (TOGETHER_API_KEY) {
    try {
      const result = await togetherGenerate({ prompt, width: w, height: h, referenceImages: body.reference_images })
      if (result.images.length > 0) return c.json({ ok: true, images: result.images, provider: 'together', model: result.model })
    } catch (err: any) { console.log('[generate] Together AI error:', err.message) }
  }

  const svg = generatePlaceholderSvg(prompt, w, h, seed)
  return c.json({ ok: true, images: [{ url: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` }], provider: 'preview', note: 'Preview image.' })
})

// ── Newsletter Subscription ────────────────────────────────────

app.post('/newsletter/subscribe', optionalAuth, async (c) => {
  const body = await c.req.json<{ email?: string; name?: string }>()
  const email = body.email?.trim().toLowerCase()
  const name = body.name?.trim() || null
  if (!email) return c.json({ error: 'Email is required' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Invalid email address' }, 400)

  const sessionUser = c.get('user') ?? null

  try {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } })
    if (existing && !existing.unsubscribed) return c.json({ ok: true, message: 'You are already subscribed!' })

    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { unsubscribed: false, unsubscribedAt: null, name: name ?? existing?.name ?? null, userId: sessionUser?.userId ?? existing?.userId ?? null },
      create: { email, name, userId: sessionUser?.userId ?? null, source: 'newsletter-form' },
    })

    const unsubToken = require('crypto').createHash('sha256').update(email + 'unsubscribe').digest('hex').slice(0, 16)
    const unsubUrl = `/api/newsletter/unsubscribe?token=${unsubToken}&email=${encodeURIComponent(email)}`

    const welcomeHtml = emailHtmlWrapper('Thanks for subscribing!', `
      <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">You're in! 🔔</h2>
      <p style="color:#ccc;font-size:14px;line-height:1.6;">Thanks for subscribing to the DriveKit newsletter.</p>
      <p style="color:#888;font-size:12px;margin-top:24px;">Don't want these emails? <a href="${unsubUrl}" style="color:#dc2626;">Unsubscribe</a></p>
    `)
    sendEmail(email, 'Welcome to the DriveKit Newsletter! 🔔', welcomeHtml, 'newsletter-welcome').catch(() => {})

    return c.json({ ok: true, message: 'Successfully subscribed!', subscriber: { id: subscriber.id, email: subscriber.email } })
  } catch {
    return c.json({ error: 'Failed to subscribe' }, 500)
  }
})

app.get('/newsletter/unsubscribe', async (c) => {
  const email = c.req.query('email')?.toLowerCase().trim()
  const token = c.req.query('token')
  if (!email || !token) return c.html('<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:48px;text-align:center;"><h1>Invalid unsubscribe link</h1></body></html>')

  const expectedToken = require('crypto').createHash('sha256').update(email + 'unsubscribe').digest('hex').slice(0, 16)
  if (token !== expectedToken) return c.html('<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:48px;text-align:center;"><h1>Invalid token</h1></body></html>')

  try {
    await prisma.newsletterSubscriber.update({ where: { email }, data: { unsubscribed: true, unsubscribedAt: new Date() } })
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) await prisma.$executeRaw`UPDATE users SET email_opt_in = 0 WHERE id = ${user.id}`
    return c.html(`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#111;color:#fff;padding:48px;text-align:center;">
      <h1 style="font-size:28px;">You've been unsubscribed</h1>
      <p style="color:#ccc;margin-top:12px;">You won't receive any more marketing emails from DriveKit.</p>
    </body></html>`)
  } catch {
    return c.html('<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:48px;text-align:center;"><h1>Something went wrong</h1></body></html>')
  }
})

app.get('/newsletter/stats', requireAdminMiddleware, async (c) => {
  const [total, active, unsubscribed, recentEmails] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { unsubscribed: false } }),
    prisma.newsletterSubscriber.count({ where: { unsubscribed: true } }),
    prisma.emailLog.findMany({ orderBy: { sentAt: 'desc' }, take: 20 }),
  ])
  return c.json({ total, active, unsubscribed, recentEmails })
})

// ── Admin Email Broadcast ─────────────────────────────────────

app.post('/admin/email/broadcast', requireAdminMiddleware, async (c) => {
  const body = await c.req.json<{ subject?: string; htmlBody?: string; campaignId?: string }>()
  const subject = body.subject?.trim()
  const htmlBody = body.htmlBody?.trim()
  const campaignId = body.campaignId || `campaign-${Date.now()}`
  if (!subject || !htmlBody) return c.json({ error: 'Subject and body are required' }, 400)

  const subscribers = await prisma.newsletterSubscriber.findMany({ where: { unsubscribed: false }, select: { email: true, name: true } })
  if (subscribers.length === 0) return c.json({ ok: true, sent: 0, message: 'No active subscribers' })

  const wrappedHtml = emailHtmlWrapper(subject, htmlBody)
  let sent = 0; let failed = 0
  for (const sub of subscribers) {
    const personalized = wrappedHtml.replace('${name ? \', \' + name : \'\'}', sub.name ? `, ${sub.name}` : '')
    const result = await sendEmail(sub.email, subject, personalized, 'broadcast')
    if (result.ok) { sent++ } else { failed++ }
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`[broadcast] Campaign ${campaignId}: sent ${sent}, failed ${failed}, total ${subscribers.length}`)
  return c.json({ ok: true, sent, failed, total: subscribers.length, campaignId })
})

app.get('/admin/email/logs', requireAdminMiddleware, async (c) => {
  const logs = await prisma.emailLog.findMany({ orderBy: { sentAt: 'desc' }, take: 100 })
  return c.json({ logs })
})

app.get('/admin/email/smtp-status', requireAdminMiddleware, async (c) => {
  const smtp = getSmtpConfig()
  return c.json({ configured: !!smtp, host: smtp?.host ?? null, port: smtp?.port ?? null, secure: smtp?.secure ?? false, from: smtp?.from ?? null })
})

// ── Email Verification ──────────────────────────────────────

app.post('/auth/send-verification', async (c) => {
  const bearerToken = c.req.header('Authorization')?.replace('Bearer ', '')
  const body = await c.req.json().catch(() => ({})) as Record<string, any>

  let email: string | null = null
  let userId: string | null = null

  if (bearerToken) {
    const session = getSessionUser(c)
    if (session) { userId = session.userId; email = session.email }
  }

  if (!email && body.email && body.password) {
    const u = await prisma.user.findUnique({ where: { email: String(body.email).trim().toLowerCase() } })
    if (u && u.passwordHash === hashPassword(String(body.password))) { userId = u.id; email = u.email }
  }

  if (!email) return c.json({ error: 'Authentication required' }, 401)

  const token = randomBytes(32).toString('hex')
  await prisma.$executeRaw`UPDATE users SET verification_token = ${token} WHERE id = ${userId}`

  const verifyUrl = `/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  const html = emailHtmlWrapper('Verify Your Email', `
    <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">Verify your email address ✉️</h2>
    <p style="color:#ccc;font-size:14px;line-height:1.6;">Click below to verify your DriveKit account email.</p>
    <p style="margin-top:16px;"><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Verify My Email</a></p>
  `)

  const result = await sendEmail(email, 'Verify your DriveKit email ✉️', html, 'verification')
  if (result.ok) return c.json({ ok: true, message: 'Verification email sent' })
  return c.json({ ok: true, message: 'Verification email queued (SMTP not configured)' })
})

app.get('/auth/verify-email', async (c) => {
  const token = c.req.query('token')
  const email = c.req.query('email')?.toLowerCase().trim()
  if (!token || !email) return c.html(`<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:48px;text-align:center;"><h1 style="color:#dc2626;">Invalid Link</h1></body></html>`)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.verificationToken !== token) return c.html(`<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:48px;text-align:center;"><h1 style="color:#dc2626;">Verification Failed</h1></body></html>`)

  await prisma.$executeRaw`UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ${user.id}`
  return c.html(`<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:48px;text-align:center;"><h1>Email Verified! ✅</h1><p style="margin-top:24px;"><a href="/" style="color:#dc2626;">Back to DriveKit</a></p></body></html>`)
})

// ── Subscriber List (Admin) ───────────────────────────────────

app.get('/admin/email/subscribers', requireAdminMiddleware, async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '25')))
  const search = c.req.query('search')?.trim().toLowerCase() ?? ''
  const status = c.req.query('status') ?? 'all'

  const where: any = {}
  if (search) where.OR = [{ email: { contains: search } }, { name: { contains: search } }]
  if (status === 'active') where.unsubscribed = false
  if (status === 'unsubscribed') where.unsubscribed = true

  const [subscribers, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where, orderBy: { subscribedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      select: { id: true, email: true, name: true, source: true, subscribedAt: true, unsubscribed: true, unsubscribedAt: true },
    }),
    prisma.newsletterSubscriber.count({ where }),
  ])

  return c.json({ subscribers, total, page, totalPages: Math.ceil(total / limit), limit })
})

app.delete('/admin/email/subscribers/:id', requireAdminMiddleware, async (c) => {
  await prisma.newsletterSubscriber.delete({ where: { id: c.req.param('id') } })
  return c.json({ ok: true })
})

// ── Test Email (Admin) ────────────────────────────────────────

app.post('/admin/email/test', requireAdminMiddleware, async (c) => {
  const body = await c.req.json<{ to?: string }>()
  const to = body.to?.trim().toLowerCase()
  if (!to) return c.json({ error: 'Recipient email is required' }, 400)

  const html = emailHtmlWrapper('Test Email from DriveKit', `
    <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">Test email ✅</h2>
    <p style="color:#ccc;font-size:14px;line-height:1.6;">This is a test email from your DriveKit admin panel.</p>
  `)

  const result = await sendEmail(to, 'DriveKit — Test Email ✅', html, 'admin-test')
  if (result.ok) return c.json({ ok: true, message: `Test email sent to ${to}` })
  return c.json({ ok: false, error: result.error ?? 'Failed to send' }, 500)
})

// ── Known Products Management (Admin) ────────────────────────

app.get('/admin/known-products', requireAdminMiddleware, async (c) => {
  const known = readKnownProducts()
  return c.json({ knownIds: known.knownIds, lastSyncAt: known.lastSyncAt, count: known.knownIds.length })
})

app.post('/admin/known-products/mark-all', requireAdminMiddleware, async (c) => {
  let products: any[] = []
  try {
    if (existsSync(CACHE_FILE)) { products = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')).products ?? [] }
  } catch {}
  if (products.length === 0) return c.json({ ok: true, marked: 0, message: 'No products in cache' })
  markProductsAsKnown(products.map((p: any) => p.id))
  return c.json({ ok: true, marked: products.length })
})

app.post('/admin/known-products/reset', requireAdminMiddleware, async (c) => {
  writeKnownProducts({ knownIds: [], lastSyncAt: '' })
  return c.json({ ok: true, message: 'Known products reset. Next sync will treat all products as new.' })
})

// ── Contact Form ─────────────────────────────────────────────

app.post('/contact', async (c) => {
  const body = await c.req.json<{ name?: string; email?: string; subject?: string; message?: string }>()
  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const subject = body.subject?.trim()
  const message = body.message?.trim()

  if (!name || !email || !message) return c.json({ error: 'Name, email, and message are required' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Invalid email address' }, 400)

  const resendConfig = getResendConfig()
  if (!resendConfig) return c.json({ ok: true, message: 'Your message has been received. We will get back to you within 24 hours.' })

  const contactHtml = emailHtmlWrapper('New Contact Form Message', `
    <h2 style="color:#fff;font-size:20px;margin:16px 0 8px;">New message from ${name}</h2>
    <div style="background:#222;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#aaa;font-size:13px;margin:0 0 4px;"><strong>Email:</strong> ${email}</p>
      <p style="color:#aaa;font-size:13px;margin:0 0 4px;"><strong>Subject:</strong> ${subject || 'No subject'}</p>
      <hr style="border:none;border-top:1px solid #444;margin:12px 0;" />
      <p style="color:#ccc;font-size:14px;white-space:pre-wrap;line-height:1.6;">${message}</p>
    </div>
  `)

  const result = await sendEmail(env('FROM_EMAIL') ?? 'support.drivekit@gmail.com', `Contact: ${subject || 'No subject'} — from ${name}`, contactHtml, 'contact-form')
  return c.json({ ok: true, message: 'Message sent! We will get back to you within 24 hours.' })
})

// ── Backup Download ───────────────────────────────────────────

app.get('/download/backup', async (c) => {
  const backupPath = join(process.cwd(), 'drivekit-backup.tar.gz')
  if (!existsSync(backupPath)) return c.json({ error: 'Backup file not found' }, 404)
  const data = readFileSync(backupPath)
  return new Response(data, {
    headers: { 'Content-Type': 'application/gzip', 'Content-Disposition': 'attachment; filename="drivekit-backup.tar.gz"', 'Content-Length': String(data.length) },
  })
})

export default app
