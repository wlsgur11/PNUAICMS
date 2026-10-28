# 교육원 운영 사이트 실적 숫자

대시보드 맨 위 '교육원 운영 서비스' 숫자는 `src/lib/site-metrics.ts` 에 손으로 넣는다. 사이트마다 DB 에서 아래 SQL 을 돌리고, 결과와 기준일(`asOf`)을 파일에 넣은 뒤 배포한다. 운영 시작 시기(`since`), 활용(`usedIn`), 주요 기능(`features`)도 같은 파일에서 고친다. AICMS 카드는 자동 계산.

서버 접속과 DB 들어가는 방법은 서버 주소와 계정이 들어가서 저장소에 두지 않는다. 담당자가 따로 보관한다.

모든 SQL 은 읽기만 한다.

## 코드플레이스 (PostgreSQL, 읽기 전용 복제본 권장)

```sql
SELECT
  (SELECT count(*) FROM problem WHERE contest_id IS NULL AND visible) AS problems,
  (SELECT count(*) FROM "user" WHERE NOT is_disabled AND admin_type = 'Regular User' AND username NOT LIKE 'loadtest%') AS users,
  (SELECT count(*) FROM submission WHERE username NOT LIKE 'loadtest%') AS submissions,
  (SELECT count(*) FROM problem_ai_hint_log) AS ai_hints,
  (SELECT count(*) FROM contest) AS contests;
```

problems 등록 문제 (대회용 제외) / users 가입자 (부하 테스트 계정 제외) / submissions 누적 제출 / ai_hints AI 조교 사용 / contests 대회 운영. 활용 교과목 수는 직접 센다.

## AI 역량지원시스템 (MySQL)

```sql
SELECT
  (SELECT count(*) FROM swcss_member.student_member sm
     JOIN swcss_member.member m ON m.id = sm.member_id
    WHERE m.is_deleted = false) AS students,
  (SELECT count(*) FROM swcss_milestone.milestone_history WHERE is_deleted = false) AS milestone_apps,
  (SELECT count(*) FROM swcss_bootcamp.bootcamp_post) AS bootcamp_posts,
  (SELECT count(*) FROM swcss_bootcamp.bootcamp_application) AS bootcamp_apps,
  (SELECT count(*) FROM swcss_bootcamp.bootcamp_completion_application WHERE status <> 'CANCELED') AS completion_apps,
  (SELECT count(*) FROM swcss_bootcamp.bootcamp_completion_application WHERE status = 'APPROVED') AS completion_approved;
```

## AIPMS (PostgreSQL)

```sql
SELECT
  (SELECT count(*) FROM project_team) AS teams,
  (SELECT count(*) FROM "user" WHERE role = 'STUDENT') AS students,
  (SELECT count(*) FROM project_program) AS programs,
  (SELECT count(*) FROM report) AS reports,
  (SELECT count(*) FROM "user" WHERE role = 'ADVISOR') AS advisors;
```

공개 결과물 수는 `/archive` 화면의 개수를 그대로 쓴다.

## 피클 (PostgreSQL)

```sql
SELECT
  (SELECT count(*) FROM users WHERE withdrawn_at IS NULL AND disabled_at IS NULL) AS users,
  (SELECT count(*) FROM orgs WHERE NOT hidden) AS orgs,
  (SELECT count(*) FROM workspaces WHERE deleted_at IS NULL) AS workspaces,
  (SELECT count(*) FROM vms) AS vms_total,
  (SELECT count(*) FROM llm_api_keys) AS llm_keys;
```

vms_total 은 지금까지 만든 전체 수. 살아 있는 것만은 `WHERE deleted_at IS NULL`.
