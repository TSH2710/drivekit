FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

RUN bunx prisma generate
RUN bunx prisma db push --skip-generate
RUN bun run build || true

EXPOSE 3001
CMD ["bun", "run", "server.tsx"]
