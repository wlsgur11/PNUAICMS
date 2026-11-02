/**
 * 대시보드 맨 위 이용 안내. 예전 로그인 랜딩에 있던 이용 절차, 주요 기능, 역할별 안내를
 * 옮겨 왔다. 평소에는 접혀 있어서 대시보드가 먼저 보이고, 권한을 기다리는 일반 계정만
 * 펼친 채로 시작한다. 접고 펴기는 <details> 라 스크립트가 필요 없다.
 */
const STEPS = [
  { title: '구글 로그인', desc: '@pusan.ac.kr 계정으로 들어옵니다. 다른 도메인 계정은 로그인되지 않습니다.' },
  { title: '권한 부여', desc: '처음 들어오면 일반 계정입니다. 관리자가 권한을 주면 그때부터 데이터가 열립니다.' },
  { title: '기업과 실적', desc: '기업을 등록하고 컨택 이력을 남깁니다. 실적 엑셀을 올리면 기업에 자동으로 붙습니다.' },
  { title: '학생과 상담', desc: '학생 이력을 등록하고, 만날 때마다 상담 내역을 그 학생 아래에 쌓습니다.' },
];

const FEATURES = [
  { title: '기업 관리', desc: '기업 정보와 실무자, 컨택 이력을 한곳에서 봅니다. 기업명만 넣으면 사업자 정보를 자동으로 조회해 채웁니다.' },
  { title: '산학·인턴십 실적', desc: '실적 엑셀을 올리면 기업에 자동으로 연결됩니다. 엑셀에 이름이 다르게 적혀 와도 별칭으로 이어 둘 수 있습니다.' },
  { title: 'SW중심대학 성과', desc: '목표 대비 달성률과 영역별 지표를 연도별로 비교합니다. 전년 대비 증감을 함께 표시합니다.' },
  { title: '학생 이력', desc: '학생 한 명의 상담 내역과 사업 참여, 인턴십, 취업 기업을 한 화면에 모읍니다. 상담은 학생 상세에서 바로 넣고 고칩니다.' },
  { title: '대시보드', desc: '목표 달성률과 파이프라인, 지역·분야 쏠림, 다음에 연락할 기업을 첫 화면에서 확인합니다.' },
  { title: '엑셀 연동', desc: '올리기와 내려받기를 모두 지원합니다. 목록에 건 필터가 그대로 적용된 엑셀을 받습니다.' },
];

const ROLES = [
  { role: '일반', work: '로그인만 됩니다. 관리자가 권한을 줄 때까지 기업·실적·학생 데이터는 보이지 않습니다.' },
  { role: '관리자', work: '기업과 실적, 학생 이력을 보고 등록하고 수정합니다. 엑셀을 올리고 내려받습니다.' },
  { role: '슈퍼관리자', work: '관리자 권한에 더해 사용자 계정의 역할을 부여하고 회수합니다.' },
];

export default function GuideBlock({ open }: { open: boolean }) {
  return (
    <details className="card guide" open={open}>
      <summary className="guide-summary">
        <span className="card-title" style={{ margin: 0 }}><span className="accent-bar" />이용 안내</span>
        <span className="guide-hint">이용 절차, 주요 기능, 역할별 권한</span>
      </summary>

      <div className="guide-body">
        <section>
          <h3 className="guide-h">이용 절차</h3>
          <ol className="guide-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="guide-no">{String(i + 1).padStart(2, '0')}</span>
                <div><strong>{s.title}</strong><p>{s.desc}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="guide-h">주요 기능</h3>
          <dl className="guide-features">
            {FEATURES.map((f) => (
              <div key={f.title}><dt>{f.title}</dt><dd>{f.desc}</dd></div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className="guide-h">역할별 안내</h3>
          <p className="guide-lead">
            @pusan.ac.kr 계정이면 학과나 소속에 관계없이 로그인됩니다. 권한은 슈퍼관리자가 계정마다 지정하고,
            처음 로그인한 계정은 모두 일반으로 시작합니다.
          </p>
          <dl className="guide-roles">
            {ROLES.map((r) => (
              <div key={r.role}><dt>{r.role}</dt><dd>{r.work}</dd></div>
            ))}
          </dl>
        </section>
      </div>
    </details>
  );
}
