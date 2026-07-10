FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install

COPY prisma ./prisma
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
RUN bunx prisma generate
RUN bunx prisma db push --skip-generate || true

COPY . .
RUN bun run build

EXPOSE 3001
CMD ["bun", "run", "server.tsx"]
