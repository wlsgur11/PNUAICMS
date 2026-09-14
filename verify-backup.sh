#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# 백업 덤프 복구 검증. 최신 덤프를 버릴 컨테이너에 실제로 복원해 본다.
#
#   ./verify-backup.sh              # ~/cms-backups 의 최신 덤프
#   ./verify-backup.sh <덤프경로>    # 특정 덤프
#
# 한 번도 복원해 본 적 없는 백업은 백업이 아니다. pg_dump 가 성공했다는 것과
# 그 파일로 실제 복구가 된다는 것은 다른 말이다. 파일이 중간에 잘렸거나,
# 운영 postgres 메이저 버전이 올라가 덤프 포맷이 어긋났거나, 디스크가 조용히
# 썩었어도 백업 로그에는 'backup OK' 만 남는다.
#
# 운영 DB 는 건드리지 않는다. 읽는 것은 덤프 파일과 cms_db 의 버전 문자열뿐이고,
# 복원은 포트를 열지 않은 별도 컨테이너 안에서만 일어난다. 끝나면 지운다.
#
# cron 예시 (매주 월요일 04시, 백업 03시 다음):
#   0 4 * * 1 /home/swedu-5/cms/verify-backup.sh >> /home/swedu-5/cms-backups/verify.log 2>&1
# ─────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

BACKUP_DIR="${BACKUP_DIR:-$HOME/cms-backups}"
DUMP="${1:-}"
if [ -z "$DUMP" ]; then
  DUMP="$(ls -1t "$BACKUP_DIR"/cms-*.dump 2>/dev/null | head -1 || true)"
fi
if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "✗ 덤프를 찾을 수 없습니다 ($BACKUP_DIR)"
  exit 1
fi

CHECK_CT=cms_restore_check
# 운영과 같은 메이저 버전으로 띄운다. 버전이 다르면 복원이 되더라도 실제
# 복구 상황을 재현한 것이 아니다. cms_db 가 없으면(관리자 PC 등) 17 로 둔다.
PGMAJOR="$(docker exec cms_db postgres --version 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo 17)"

cleanup() { docker rm -f "$CHECK_CT" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

echo "덤프      : $DUMP"
echo "크기      : $(du -h "$DUMP" | cut -f1)"
echo "만든 시각 : $(date -r "$DUMP" '+%Y-%m-%d %H:%M:%S')"
echo "postgres  : $PGMAJOR"
echo

# ── 1) 목차 읽기. 파일이 잘렸거나 포맷이 깨졌으면 여기서 걸린다
if ! OBJECTS="$(pg_restore --list "$DUMP" 2>/dev/null | grep -c '^[0-9]')"; then
  # 호스트에 pg_restore 가 없을 수 있다. 그럴 땐 컨테이너 안에서 확인한다
  OBJECTS=""
fi
# 여기도 && 로 쓰면 안 된다. OBJECTS 가 비었을 때 1 로 끝나 set -e 가 스크립트를 죽인다
if [ -n "$OBJECTS" ]; then echo "목차 객체 : ${OBJECTS}개"; fi

# ── 2) 버릴 컨테이너에 실제 복원
# 포트를 열지 않는다. 비밀번호는 이 실행에서만 쓰고 버린다
TMPPW="$(openssl rand -hex 16 2>/dev/null || date +%s%N)"
docker run -d --name "$CHECK_CT" \
  -e POSTGRES_USER=cms -e POSTGRES_PASSWORD="$TMPPW" -e POSTGRES_DB=cms \
  "postgres:$PGMAJOR" >/dev/null

echo -n "기동 대기 "
for i in $(seq 1 30); do
  if docker exec "$CHECK_CT" pg_isready -U cms -d cms >/dev/null 2>&1; then break; fi
  echo -n "."
  sleep 1
  # && 로 쓰면 i 가 30 이 아닐 때 반복문 본문이 1 로 끝나 set -e 가 스크립트를 죽인다
  if [ "$i" = 30 ]; then echo; echo "✗ 검증용 DB 가 뜨지 않았습니다"; exit 1; fi
done
echo " 완료"
echo

docker cp "$DUMP" "$CHECK_CT:/tmp/v.dump" >/dev/null

# pg_restore 는 소유자/권한 관련으로 경고를 내며 1 을 돌려주기도 한다.
# 경고와 진짜 실패를 가르기 위해 출력을 받아 두고 뒤에서 행 수로 판정한다
set +e
RESTORE_OUT="$(docker exec -e PGPASSWORD="$TMPPW" "$CHECK_CT" \
  pg_restore -U cms -d cms --no-owner --no-acl /tmp/v.dump 2>&1)"
RESTORE_RC=$?
set -e
if [ -n "$RESTORE_OUT" ]; then
  echo "복원 메시지:"
  echo "$RESTORE_OUT" | sed 's/^/  /'
  echo
fi

# ── 3) 복원된 내용 확인. 표가 서고 행이 들어왔는지 본다
# 표가 없으면 psql 이 실패한다. 그건 판정 재료라서 여기서 죽으면 안 된다.
# pipefail 이 걸려 있어 || true 를 붙이지 않으면 set -e 가 스크립트를 끝낸다
q() {
  docker exec -e PGPASSWORD="$TMPPW" "$CHECK_CT" psql -U cms -d cms -tAc "$1" 2>/dev/null | tr -d '[:space:]' || true
}

TABLES="$(q "select count(*) from information_schema.tables where table_schema='public'")"
echo "복원된 표 : ${TABLES:-0}개"
echo
printf '%-22s %s\n' "테이블" "행 수"
FAIL=0
# Prisma 가 @@map 으로 snake_case 복수형을 쓴다. 모델명이 아니라 실제 표 이름이어야 한다
for t in companies projects internships students contact_histories swcu_indicators year_stats; do
  n="$(q "select count(*) from \"$t\"")"
  if [ -z "$n" ]; then
    printf '%-22s %s\n' "$t" "없음"
    FAIL=1
  else
    printf '%-22s %s\n' "$t" "$n"
  fi
done
echo

# 핵심 표에 행이 하나도 없으면 덤프는 열렸어도 내용이 비었다는 뜻이다
COMPANIES="$(q "select count(*) from companies")"
if [ "${TABLES:-0}" -lt 5 ] || [ "${COMPANIES:-0}" -lt 1 ] || [ "$FAIL" = 1 ]; then
  echo "✗ 복구 검증 실패. 이 덤프로는 복구할 수 없습니다 (pg_restore 종료코드 $RESTORE_RC)"
  exit 1
fi

echo "✓ 복구 검증 통과. 이 덤프로 복구할 수 있습니다"
