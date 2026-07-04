import { existsSync, readFileSync } from 'fs'
import { prisma } from './db'

function loadDotEnv(): Record<string, string> {
  const vars: Record<string, string> = {}
  try {
    const raw = existsSync('.env') ? readFileSync('.env', 'utf-8') : ''
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 0) continue
      vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
  } catch {}
  return vars
}

export function env(key: string): string | undefined {
  if (process.env[key]) return process.env[key]
  return loadDotEnv()[key]
}

export function getResendConfig() {
  const apiKey = env('RESEND_API_KEY')
  if (!apiKey) return null
  return {
    apiKey,
    from: env('FROM_EMAIL') ?? 'DriveKit <orders@resend.dev>',
  }
}

export function getSmtpConfig() {
  const config = getResendConfig()
  if (!config) return null
  return {
    host: 'resend',
    port: 443,
    secure: true,
    auth: { user: 'resend', pass: config.apiKey },
    from: config.from,
  }
}

export function emailHtmlWrapper(title: string, contentHtml: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#111;color:#fff;padding:32px;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="color:#fff;font-size:24px;margin-bottom:4px;">DRIVE<span style="color:#dc2626;">KIT</span></h1>
    <hr style="border:none;border-top:2px solid #333;margin:16px 0;" />
    ${contentHtml}
    <hr style="border:none;border-top:2px solid #333;margin:24px 0 16px;" />
    <p style="color:#666;font-size:12px;text-align:center;">DriveKit · Premium Car Accessories</p>
    <p style="color:#666;font-size:11px;text-align:center;"><a href="https://drivekit.com" style="color:#666;">Visit DriveKit.com</a> · <a href="#" style="color:#666;">Unsubscribe</a></p>
  </div></body></html>`
}

export async function sendEmail(to: string, subject: string, html: string, type = 'general'): Promise<{ ok: boolean; error?: string }> {
  const config = getResendConfig()
  if (!config) {
    console.log(`[email] Resend not configured — skipping ${type} email to ${to}`)
    return { ok: false, error: 'Email not configured (set RESEND_API_KEY in .env)' }
  }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(config.apiKey)
    const fromAddress = config.from.includes('<') ? config.from : `DriveKit <${config.from}>`
    await resend.emails.send({ from: fromAddress, to, subject, html })

    await prisma.emailLog.create({ data: { to, subject, type, status: 'sent' } }).catch(() => {})
    console.log(`[email] Sent ${type} email to ${to}: ${subject}`)
    return { ok: true }
  } catch (err: any) {
    console.error(`[email] Failed to send ${type} to ${to}:`, err.message)
    await prisma.emailLog.create({ data: { to, subject, type, status: 'failed' } }).catch(() => {})
    return { ok: false, error: err.message }
  }
}
