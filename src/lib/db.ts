// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2026 Shogo Technologies, Inc.
import { PrismaClient } from '../generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL || ''
  const isSqlite = url.startsWith('file:') || !url

  if (isSqlite) {
    try {
      const { PrismaLibSql } = require('@prisma/adapter-libsql')
      const adapter = new PrismaLibSql({ url: url || 'file:./dev.db' })
      return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
    } catch {
      // adapter not available — fall through to plain client
    }
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
