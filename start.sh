#!/bin/sh
set -e

echo "🔄 Running database migrations..."
bunx prisma db push --accept-data-loss 2>&1 || echo "⚠️  db push failed (non-fatal, continuing...)"

echo "🚀 Starting server..."
exec bun run server.tsx
