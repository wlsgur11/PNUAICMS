#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# 자체 서버 DB 일일 백업. cron 으로 매일 03시에 돈다.
#   crontab -e 예시:
#     0 3 * * * /home/swedu-5/cms/backup-db.sh >> /home/swedu-5/cms-backups/backup.log 2>&1
#
# DB 가 이 서버 하나뿐이라 이 백업이 유일한 안전장치다.
# 덤프는 ~/cms-backups 에 14일치만 남기고 그보다 오래된 것은 지운다.
#
# 주의: 덤프에 학생 실명과 연락처가 들어있다. 같은 디스크에만 두면
#       디스크가 죽을 때 백업도 함께 죽는다. 외부로 복사하는 것을 권장한다.
# ─────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"
BACKUP_DIR="$HOME/cms-backups"; mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
PGPW="$(grep '^POSTGRES_PASSWORD=' .env | tail -1 | sed 's/^POSTGRES_PASSWORD=//')"
docker exec -e PGPASSWORD="$PGPW" cms_db pg_dump -U cms -h 127.0.0.1 -d cms --no-owner --no-acl -Fc -f /tmp/cms-$TS.dump
docker cp cms_db:/tmp/cms-$TS.dump "$BACKUP_DIR/cms-$TS.dump"
docker exec cms_db rm -f /tmp/cms-$TS.dump
# docker cp 는 644 로 떨어진다. 개인정보가 든 파일이라 주인만 읽게 조인다.
chmod 600 "$BACKUP_DIR/cms-$TS.dump"
find "$BACKUP_DIR" -name 'cms-*.dump' -mtime +14 -delete
echo "$(date) backup OK: cms-$TS.dump"
