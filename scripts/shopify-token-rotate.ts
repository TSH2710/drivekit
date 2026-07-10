#!/usr/bin/env bun
/**
 * Shopify Access Token Rotation Script
 *
 * Validates the current access token and refreshes it if expired.
 * Works with Shopify's OAuth token refresh flow.
 *
 * Environment variables (set in .env or Railway):
 *   SHOPIFY_STORE_DOMAIN   — e.g. "dc5byu-fy.myshopify.com" or just "dc5byu-fy"
 *   SHOPIFY_ACCESS_TOKEN   — current access token
 *   SHOPIFY_REFRESH_TOKEN  — refresh token from the OAuth flow
 *   SHOPIFY_CLIENT_ID      — your app's API key
 *   SHOPIFY_CLIENT_SECRET  — your app's API secret
 *
 * Usage:
 *   bun run scripts/shopify-token-rotate.ts           — single rotation check
 *   bun run scripts/shopify-token-rotate.ts --schedule — run every 20 hours
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ENV_PATH = resolve(import.meta.dir, '..', '.env')

// ── Load .env if present ─────────────────────────────────────────────
function loadEnv() {
  if (!existsSync(ENV_PATH)) return
  const lines = readFileSync(ENV_PATH, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

// ── Save updated tokens back to .env ─────────────────────────────────
function saveTokenToEnv(newAccessToken: string, newRefreshToken: string) {
  let content = ''
  if (existsSync(ENV_PATH)) {
    content = readFileSync(ENV_PATH, 'utf-8')
  }

  const vars: Record<string, string> = {
    SHOPIFY_ACCESS_TOKEN: newAccessToken,
    SHOPIFY_REFRESH_TOKEN: newRefreshToken,
  }

  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    const line = `${key}=${value}`
    if (regex.test(content)) {
      content = content.replace(regex, line)
    } else {
      content = content.trim() + `\n${line}\n`
    }
  }

  writeFileSync(ENV_PATH, content, 'utf-8')
  console.log(`✅ Tokens saved to ${ENV_PATH}`)
}

// ── Validate current token ───────────────────────────────────────────
async function validateToken(shopDomain: string, accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${shopDomain}.myshopify.com/admin/api/2024-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    })
    if (res.ok) {
      const data = await res.json() as { shop: { name: string } }
      console.log(`✅ Token is valid — shop: ${data.shop.name}`)
      return true
    }
    console.log(`⚠️  Token validation failed: HTTP ${res.status}`)
    return false
  } catch (err) {
    console.error(`❌ Token validation error:`, err)
    return false
  }
}

// ── Refresh the access token ─────────────────────────────────────────
async function refreshToken(
  shopDomain: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const url = `https://${shopDomain}.myshopify.com/admin/oauth/access_token`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`❌ Refresh failed: HTTP ${res.status}\n${body}`)
      return null
    }

    const data = (await res.json()) as {
      access_token: string
      refresh_token: string
      scope: string
    }

    console.log(`✅ Token refreshed successfully`)
    console.log(`   Scope: ${data.scope}`)
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }
  } catch (err) {
    console.error(`❌ Refresh error:`, err)
    return null
  }
}

// ── Extract shop subdomain from full URL ─────────────────────────────
function extractShopDomain(storeDomain: string): string {
  // "dc5byu-fy.myshopify.com" → "dc5byu-fy"
  // "dc5byu-fy" → "dc5byu-fy"
  return storeDomain.replace(/\.myshopify\.com$/, '')
}

// ── Main ─────────────────────────────────────────────────────────────
async function rotateToken() {
  loadEnv()

  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN
  const refreshToken = process.env.SHOPIFY_REFRESH_TOKEN
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET

  if (!rawDomain || !accessToken || !refreshToken || !clientId || !clientSecret) {
    console.error('❌ Missing required environment variables:')
    console.error('   SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN, SHOPIFY_REFRESH_TOKEN,')
    console.error('   SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET')
    console.error('\n   Set these in .env or as Railway environment variables.')
    process.exit(1)
  }

  const shopDomain = extractShopDomain(rawDomain)
  console.log(`\n🔑 Checking Shopify token for ${shopDomain}.myshopify.com...`)

  const isValid = await validateToken(shopDomain, accessToken)

  if (isValid) {
    console.log('   No rotation needed.\n')
    return true
  }

  console.log('\n🔄 Refreshing access token...')

  const newTokens = await refreshToken(shopDomain, clientId, clientSecret, refreshToken)

  if (!newTokens) {
    console.error('\n❌ Token rotation failed. You may need to re-authorize the app in Shopify Admin.')
    return false
  }

  // Verify the new token works
  console.log('\n🔍 Verifying new token...')
  const newTokenValid = await validateToken(shopDomain, newTokens.accessToken)

  if (!newTokenValid) {
    console.error('\n❌ New token validation failed. Something went wrong with the refresh.')
    return false
  }

  // Save to .env
  saveTokenToEnv(newTokens.accessToken, newTokens.refreshToken)

  // Also print for Railway env var updates
  console.log('\n📋 Updated tokens (for Railway env vars):')
  console.log(`   SHOPIFY_ACCESS_TOKEN=${newTokens.accessToken}`)
  console.log(`   SHOPIFY_REFRESH_TOKEN=${newTokens.refreshToken}`)
  console.log('')

  return true
}

// ── Schedule mode (every 20 hours) ───────────────────────────────────
async function runScheduled() {
  const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000

  console.log('⏰ Scheduler started — rotating every 20 hours\n')

  // Run immediately on start
  await rotateToken()

  // Then every 20 hours
  setInterval(async () => {
    console.log(`\n⏰ Scheduled rotation at ${new Date().toISOString()}`)
    await rotateToken()
  }, TWENTY_HOURS_MS)
}

// ── Entry point ──────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args.includes('--schedule')) {
  runScheduled()
} else {
  rotateToken().then((success) => {
    process.exit(success ? 0 : 1)
  })
}
