# ─────────────────────────────────────────────────────────
# 자체 서버 Docker 배포용. next.config 의 output:'standalone' 덕분에
# 런타임 이미지가 가볍다. (배포 도구가 Compose/Swarm/K8s 무엇이든 이 이미지 그대로 사용)
# ─────────────────────────────────────────────────────────

# 1) 의존성 설치
FROM node:20-alpine AS deps
WORKDIR /app
# prisma 엔진 등이 필요로 하는 openssl
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm ci

# 2) 빌드 (alpine 위에서 빌드 → prisma 쿼리엔진이 런타임(alpine)과 동일 타깃)
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# 3) 런타임 (최소 산출물 + 비루트 실행)
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 비루트 사용자로 실행 (보안)
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone 산출물 + 정적파일 + prisma 스키마/엔진만 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# standalone 트레이싱이 누락할 수 있는 prisma 엔진을 명시적으로 보강
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
