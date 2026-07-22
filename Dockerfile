FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install

COPY . .

RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
RUN bunx prisma generate
RUN bunx prisma db push --accept-data-loss || true

RUN chmod +x start.sh
RUN bun run build

EXPOSE 3001
CMD ["./start.sh"]
# Cache-bust: 2026-07-22-v3
