import { randomBytes, randomInt, pbkdf2Sync } from 'crypto'
import { prisma } from './db'
import type { Context } from 'hono'

const SALT_ROUNDS = 100000
const KEY_LENGTH = 64

const sessions = new Map<string, { userId: string; email: string; role: string; createdAt: number }>()
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const pendingSignups = new Map<string, { code: string; email: string; passwordHash: string; name: string | null; emailOptIn: boolean; expiresAt: number }>()
export const CODE_EXPIRY_MS = 10 * 60 * 1000

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, SALT_ROUNDS, KEY_LENGTH, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const verify = pbkdf2Sync(password, salt, SALT_ROUNDS, KEY_LENGTH, 'sha512').toString('hex')
  return hash === verify
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateSixDigitCode(): string {
  return String(randomInt(100000, 1000000))
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxAttempts) return false
  entry.count++
  return true
}

export function cleanExpiredSessions() {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_MAX_AGE_MS) sessions.delete(token)
  }
}

export function getSessionUser(c: Context): { userId: string; email: string; role: string } | null {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null
  const session = sessions.get(token)
  if (!session) return null
  if (Date.now() - session.createdAt > SESSION_MAX_AGE_MS) { sessions.delete(token); return null }
  return session
}

export function setSession(token: string, userId: string, email: string, role: string) {
  cleanExpiredSessions()
  sessions.set(token, { userId, email, role, createdAt: Date.now() })
}

export function deleteSession(token: string) {
  sessions.delete(token)
}

export function requireAuth(c: Context): { userId: string; email: string; role: string } {
  const user = getSessionUser(c)
  if (!user) throw { status: 401, message: 'Not authenticated' }
  return user
}

export function requireAdmin(c: Context): { userId: string; email: string; role: string } {
  const user = requireAuth(c)
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') throw { status: 403, message: 'Forbidden' }
  return user
}
