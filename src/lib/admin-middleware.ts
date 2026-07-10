import { createMiddleware } from 'hono/factory'
import { getSessionUser } from './auth-helpers'

type AuthUser = { userId: string; email: string; role: string }

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

function handleAuthError(e: any) {
  const status = e?.status ?? 500
  const message = e?.message ?? String(e)
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const optionalAuth = createMiddleware(async (c, next) => {
  const user = getSessionUser(c)
  if (user) c.set('user', user)
  await next()
})

export const requireAuthMiddleware = createMiddleware(async (c, next) => {
  try {
    const user = getSessionUser(c)
    if (!user) throw { status: 401, message: 'Not authenticated' }
    c.set('user', user)
    await next()
  } catch (e: any) {
    return handleAuthError(e)
  }
})

export const requireAdminMiddleware = createMiddleware(async (c, next) => {
  try {
    const user = getSessionUser(c)
    if (!user) throw { status: 401, message: 'Not authenticated' }
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') throw { status: 403, message: 'Forbidden' }
    c.set('user', user)
    await next()
  } catch (e: any) {
    return handleAuthError(e)
  }
})
