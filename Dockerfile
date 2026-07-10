FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY prisma ./prisma
# Switch to PostgreSQL provider for Railway's managed Postgres
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
RUN bunx prisma generate
RUN bunx prisma db push --skip-generate || true

COPY . .
RUN bun run build || true

EXPOSE 3001
CMD ["bun", "run", "server.tsx"]
