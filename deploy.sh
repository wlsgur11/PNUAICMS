#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# 자체 서버 수동 배포 스크립트 (B안). CI가 GHCR에 올린 이미지를 SHA 태그로 받아 교체.
#   사용:
#     ./deploy.sh            # origin/main 최신 SHA 로 배포 (확인 후)
#     ./deploy.sh <SHA>      # 특정 SHA 로 배포/롤백 (7자리 short SHA)
# CI가 알아서 배포하지 않는다. 항상 사람이 SHA를 확인하고 이 스크립트로 올린다.
# ─────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.prod.yml"

# 1) 배포 대상 SHA 결정: 인자가 있으면 그 SHA, 없으면 origin/main 최신
git fetch origin main --quiet
TARGET="${1:-$(git rev-parse --short origin/main)}"

# 2) 현재 배포된 SHA (마지막 배포 기록)
CURRENT="$(cat .deployed-sha 2>/dev/null || true)"

echo "현재 배포 SHA : ${CURRENT:-(없음)}"
echo "배포 대상 SHA : ${TARGET}"
if [ "${CURRENT}" = "${TARGET}" ]; then
  echo "이미 같은 버전입니다. 종료."
  exit 0
fi

# 3) 그 사이 바뀐 커밋 보여주기 (처음 배포거나 롤백이면 생략)
if [ -n "${CURRENT}" ]; then
  echo "=== 적용될 커밋 (${CURRENT}..${TARGET}) ==="
  git log --oneline "${CURRENT}..${TARGET}" 2>/dev/null || echo "(범위 비교 불가 - 롤백이거나 직접 지정한 SHA)"
fi

# 4) 사람이 확인
read -rp $'\n이 이미지로 배포할까요? (y/N) ' ans
[ "${ans}" = "y" ] || { echo "취소."; exit 0; }

# 5) 해당 SHA 이미지 pull + 무중단에 가깝게 교체
export TAG="${TARGET}"
${COMPOSE} pull
${COMPOSE} up -d
echo "${TARGET}" > .deployed-sha
docker image prune -f
echo "✅ 배포 완료: ${TARGET}   (롤백하려면: ./deploy.sh <이전SHA>)"
