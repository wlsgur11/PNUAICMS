# 배포 가이드 (자체 서버)

현재는 Vercel에 배포되지만, 자체 서버 PC로 옮길 때를 위한 문서입니다. 앱은 `output: 'standalone'` + Docker 이미지로 패키징되어, 배포 도구(Compose/Swarm/K8s)가 무엇이든 같은 이미지를 씁니다.

## 배포 도구 추천

| 단계 | 도구 | 언제 |
|---|---|---|
| 1 (지금 권장) | **Docker Compose** | 단일 서버 PC. 가장 단순. `up -d` 한 줄. |
| 2 | **Docker Swarm** | 무중단 롤링 업데이트·복제·여러 노드가 필요해질 때. Compose 문법 거의 그대로 확장. 학습비용 낮음. |
| 3 | **Kubernetes** | 대규모·오토스케일·생태계(Helm/Ingress/모니터링)가 꼭 필요할 때. 단일 PC엔 과함. |

권장 경로: **Compose로 시작 → 필요해지면 Swarm → K8s는 마지막**. 교내 단일 서버 단계에서 K8s는 운영 부담만 큽니다.

## 빠른 시작 (Compose)

```bash
# 1) 같은 폴더에 .env 작성 (.env.example 참고)
#    POSTGRES_PASSWORD=...  AUTH_SECRET=...  AUTH_GOOGLE_ID=...  AUTH_GOOGLE_SECRET=...
#    AUTH_BYPASS=false

# 2) 빌드 + 실행
docker compose up -d --build

# 3) 상태 확인
docker compose ps
docker compose logs -f app
```

앱: `http://서버주소:3000`. 앞단에 Nginx/Caddy를 두고 HTTPS(도메인)를 붙이는 것을 권장합니다.

## 스키마 적용 (첫 실행 / 변경 시)

런타임 이미지는 가볍게 만들려고 Prisma CLI를 포함하지 않습니다. 스키마는 **관리자 PC에서 서버 DB를 가리켜 적용**하는 방식이 가장 간단합니다 (지금 Supabase에 적용하던 방식과 동일).

```bash
# 서버 DB 포트를 SSH 터널로 로컬에 연결 (db 컨테이너 포트를 외부 노출하지 않아도 됨)
ssh -L 5432:localhost:5432 사용자@서버주소

# 다른 터미널에서, DIRECT_URL 을 터널로 향하게 두고 적용
DIRECT_URL="postgresql://cms:비번@localhost:5432/cms" \
DATABASE_URL="postgresql://cms:비번@localhost:5432/cms" \
npx prisma db push
```

> 마이그레이션 이력을 정식으로 관리하려면 `prisma migrate deploy`로 전환하는 것을 추천합니다(추후).

## 데이터 이전 (Supabase → 자체 DB)

```bash
# Supabase에서 덤프
pg_dump "$SUPABASE_DIRECT_URL" -Fc -f cms.dump

# 자체 db 컨테이너로 복원
docker compose exec -T db pg_restore -U cms -d cms < cms.dump
```

## 백업 (권장)

`pg_dump`를 cron으로 주기 실행해 덤프를 보관하세요.

```bash
0 3 * * * docker compose exec -T db pg_dump -U cms cms | gzip > /backup/cms_$(date +\%F).sql.gz
```

## 이미지 레지스트리 (추후)

배포 도구가 확정되면 GitHub Actions에 "이미지 빌드 → GHCR push → 서버에서 pull" 워크플로를 추가합니다. 현재 CI는 이미지 **빌드 검증까지만** 합니다(푸시 없음).
