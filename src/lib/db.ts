// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2026 Shogo Technologies, Inc.
import { PrismaClient } from '../generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function detectProvider(): string {
  const url = process.env.DATABASE_URL ?? ''
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) return 'postgresql'
  try {
    const fs = require('fs') as typeof import('fs')
    const path = require('path') as typeof import('path')
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    if (schema.includes('provider = "postgresql"')) return 'postgresql'
  } catch { /* fall through */ }
  return 'sqlite'
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? ''
  const provider = detectProvider()
  const logConfig = process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']

  if (provider === 'postgresql') {
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: url })
    return new PrismaClient({ adapter, log: logConfig })
  }

  const { PrismaLibSql } = require('@prisma/adapter-libsql')
  const { createClient } = require('@libsql/client')
  const libsqlUrl = url.startsWith('libsql:') || url.startsWith('file:') || url.startsWith('http')
    ? url
    : 'file:./prisma/dev.db'
  const libsql = createClient({ url: libsqlUrl })
  const adapter = new PrismaLibSql(libsql)
  return new PrismaClient({ adapter, log: logConfig })
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
