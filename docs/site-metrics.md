# 교육원 운영 사이트 실적 숫자 뽑기

대시보드 '교육원 운영 사이트' 구역의 숫자는 `src/lib/site-metrics.ts` 에 손으로 넣는다. 아래 SQL 을 각 사이트 DB 에서 돌리고, 결과와 기준일(`asOf`)을 파일에 넣은 뒤 배포한다. AICMS 카드는 자동 계산이라 넣을 것 없음.

## 코드플레이스 (PostgreSQL)

```sql
SELECT
  (SELECT count(*) FROM problem WHERE contest_id IS NULL AND visible) AS 등록_문제,
  (SELECT count(*) FROM "user" WHERE NOT is_disabled AND admin_type = 'Regular User') AS 가입자,
  (SELECT count(*) FROM submission) AS 누적_제출,
  (SELECT count(*) FROM problem_ai_hint_log) AS ai_조교_사용;
```

- 등록 문제는 대회용 문제를 빼고 공개 문제만 센다. 대회 문제까지 넣으면 실제 보유 문제보다 크게 나온다
- 가입자에 부하 테스트용 계정이 있으면 `AND username NOT LIKE '<테스트 계정 접두어>%'` 를 붙인다
- 활용 교과목 수는 DB 에 없어서 직접 센다

## AI 역량지원시스템 (MySQL)

```sql
SELECT
  (SELECT count(*) FROM swcss_member.student_member sm
     JOIN swcss_member.member m ON m.id = sm.member_id
    WHERE m.is_deleted = false) AS 가입_학생,
  (SELECT count(*) FROM swcss_milestone.milestone_history WHERE is_deleted = false) AS 마일스톤_신청,
  (SELECT count(*) FROM swcss_bootcamp.bootcamp_post) AS 부트캠프_공고,
  (SELECT count(*) FROM swcss_bootcamp.bootcamp_application) AS 부트캠프_신청,
  (SELECT count(*) FROM swcss_bootcamp.bootcamp_completion_application WHERE status <> 'CANCELED') AS 이수_신청;
```

서버에서 `mysql -h 127.0.0.1 -u swedu -p -e "<위 SQL>"`

## 피클 (PostgreSQL)

```sql
SELECT
  (SELECT count(*) FROM orgs WHERE NOT hidden) AS 이용_기관,
  (SELECT count(*) FROM users WHERE withdrawn_at IS NULL AND disabled_at IS NULL) AS 사용자,
  (SELECT count(*) FROM vms) AS 실습_vm_누적,
  (SELECT count(*) FROM llm_api_keys) AS ai_api_키_발급;
```

- 실습 VM 은 지금까지 만든 전체 수다. 지금 살아 있는 것만 세려면 `WHERE deleted_at IS NULL`

## AIPMS (PostgreSQL)

```sql
SELECT
  (SELECT count(*) FROM project_program) AS 운영_프로그램,
  (SELECT count(*) FROM project_team) AS 프로젝트_팀,
  (SELECT count(*) FROM "user" WHERE role = 'STUDENT') AS 참여_학생,
  (SELECT count(*) FROM "user" WHERE role = 'ADVISOR') AS 자문위원;
```

서버에서 `cd ~/aipms && docker compose -f compose.production.yaml --env-file .env.production exec -T postgres psql -U pms -d pms -c "<위 SQL>"`

- 공개 결과물 수는 `/archive` 화면에 보이는 개수를 그대로 쓴다
