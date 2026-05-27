# ─────────────────────────────────────────────────────────
# 교내 서버 Docker 배포용 (나중 단계). Vercel 배포에는 불필요.
# next.config 의 output:'standalone' 덕분에 런타임 이미지가 가볍다.
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# standalone 산출물 + 정적파일 + prisma 스키마만 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "server.js"]
