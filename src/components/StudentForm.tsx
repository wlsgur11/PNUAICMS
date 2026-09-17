'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { toast } from '@/components/Toaster';
import { ENUMS } from '@/lib/enums';

export type FormInternship = { internshipType: string; companyName: string; durationWeeks: string; activityDate: string };

export type StudentFormData = {
  studentNo: string;
  version?: number; // 수정 모드에서만. 낙관적 락 값을 그대로 되돌려 보낸다.
  name: string;
  department: string;
  major: string;
  grade: number;
  gpa: string;
  careerGoal: string;
  phone: string;
  email: string;
  certificates: string; // 쉼표 입력
  foreignLanguages: string; // 쉼표 입력
  clubs: string; // 쉼표 입력
  graduationDate: string;
  employmentCompany: string;
  swPrograms: string[];
  bootcampPrograms: string[];
  internships: FormInternship[];
};

export const EMPTY_STUDENT: StudentFormData = {
  studentNo: '', name: '', department: '', major: '', grade: 1, gpa: '', careerGoal: '',
  phone: '', email: '', certificates: '', foreignLanguages: '', clubs: '', graduationDate: '', employmentCompany: '',
  swPrograms: [], bootcampPrograms: [], internships: [],
};

export default function StudentForm({ initial, mode }: { initial?: StudentFormData; mode: 'create' | 'edit' }) {
  // 수정 중 학번을 고치면 입력값이 바뀐다. 요청 주소는 원래 학번이어야 해서 따로 잡아 둔다
  const originalNo = useRef(initial?.studentNo ?? '');
  const router = useRouter();
  const [f, setF] = useState<StudentFormData>(initial ?? EMPTY_STUDENT);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof StudentFormData, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  // 사업 참여는 갯수 제한이 없다. 필요한 만큼 줄을 늘린다
  type ProgramGroup = 'swPrograms' | 'bootcampPrograms';
  const addProgram = (g: ProgramGroup) => setF((p) => ({ ...p, [g]: [...p[g], ''] }));
  const setProgram = (g: ProgramGroup, i: number, v: string) =>
    setF((p) => ({ ...p, [g]: p[g].map((x, idx) => (idx === i ? v : x)) }));
  const removeProgram = (g: ProgramGroup, i: number) =>
    setF((p) => ({ ...p, [g]: p[g].filter((_, idx) => idx !== i) }));

  const addInternship = () => setF((p) => ({ ...p, internships: [...p.internships, { internshipType: '', companyName: '', durationWeeks: '', activityDate: '' }] }));
  const setInternship = (i: number, key: keyof FormInternship, v: string) =>
    setF((p) => ({ ...p, internships: p.internships.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)) }));
  const removeInternship = (i: number) => setF((p) => ({ ...p, internships: p.internships.filter((_, idx) => idx !== i) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.studentNo.trim() || !f.name.trim()) { toast('학번과 이름은 필수입니다.', 'error'); return; }
    if (mode === 'create' && (!f.phone.trim() || !f.email.trim())) {
      toast('전화번호와 이메일은 필수입니다.', 'error'); return;
    }

    const payload = {
      ...(mode === 'create' ? { studentNo: f.studentNo.trim() } : { version: f.version, studentNo: f.studentNo.trim() }),
      name: f.name.trim(),
      department: f.department.trim() || null,
      major: f.major.trim() || null,
      grade: Number(f.grade),
      gpa: f.gpa === '' ? null : Number(f.gpa),
      careerGoal: f.careerGoal || null,
      phone: f.phone.trim() || null,
      email: f.email.trim() || null,
      certificates: f.certificates.split(',').map((v) => v.trim()).filter(Boolean),
      foreignLanguages: f.foreignLanguages.split(',').map((v) => v.trim()).filter(Boolean),
      clubs: f.clubs.split(',').map((v) => v.trim()).filter(Boolean),
      graduationDate: f.graduationDate || null,
      employmentCompany: f.employmentCompany.trim() || null,
      swPrograms: f.swPrograms.map((v) => v.trim()).filter(Boolean),
      bootcampPrograms: f.bootcampPrograms.map((v) => v.trim()).filter(Boolean),
      internships: f.internships
        .filter((i) => i.internshipType || i.companyName || i.activityDate || i.durationWeeks)
        .map((i) => ({ internshipType: i.internshipType.trim(), companyName: i.companyName.trim(), durationWeeks: i.durationWeeks === '' ? null : Number(i.durationWeeks), activityDate: i.activityDate })),
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        await api('/api/students', { method: 'POST', body: JSON.stringify(payload) });
        toast('등록되었습니다.', 'success');
        router.push(`/students/${f.studentNo.trim()}`);
      } else {
        await api(`/api/students/${originalNo.current}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('수정되었습니다.', 'success');
        router.push(`/students/${f.studentNo.trim()}`);
      }
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-title" style={{ marginBottom: 12 }}><span className="accent-bar" />학생 {mode === 'create' ? '등록' : '수정'}</div>
      <div className="form-grid">
        <div className="form-field">
          <label>학번<span className="req">*</span></label>
          <input value={f.studentNo} onChange={(e) => set('studentNo', e.target.value)} placeholder="예: 20201234" />
          {mode === 'edit' && f.studentNo.trim() !== originalNo.current && (
            <span className="hint">저장하면 {originalNo.current} 에 달린 상담과 실적이 새 학번으로 함께 옮겨집니다.</span>
          )}
        </div>
        <div className="form-field">
          <label>이름<span className="req">*</span></label>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="form-field">
          <label>학과</label>
          <input value={f.department} onChange={(e) => set('department', e.target.value)} placeholder="예: 정보컴퓨터공학부" />
        </div>
        <div className="form-field">
          <label>전공</label>
          <input value={f.major} onChange={(e) => set('major', e.target.value)} />
        </div>
        <div className="form-field">
          <label>학년</label>
          <select value={f.grade} onChange={(e) => set('grade', Number(e.target.value))}>
            {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}학년</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>학점</label>
          <input type="number" step="0.01" min="0" max="4.5" value={f.gpa} onChange={(e) => set('gpa', e.target.value)} />
        </div>
        <div className="form-field">
          <label>진로희망</label>
          <select value={f.careerGoal} onChange={(e) => set('careerGoal', e.target.value)}>
            <option value="">선택</option>
            {ENUMS.CAREER_GOAL.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>전화번호{mode === 'create' && <span className="req">*</span>}</label>
          <input value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="form-field">
          <label>이메일{mode === 'create' && <span className="req">*</span>}</label>
          <input value={f.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="form-field">
          <label>졸업일자</label>
          <input type="date" value={f.graduationDate} onChange={(e) => set('graduationDate', e.target.value)} />
        </div>
        <div className="form-field full">
          <label>취업 기업명</label>
          <input value={f.employmentCompany} onChange={(e) => set('employmentCompany', e.target.value)} placeholder="졸업 후 취업 기업명" />
        </div>
        <div className="form-field full">
          <label>자격증 <span className="hint">(쉼표 구분)</span></label>
          <input value={f.certificates} onChange={(e) => set('certificates', e.target.value)} placeholder="예: 정보처리기사, SQLD" />
        </div>
        <div className="form-field full">
          <label>외국어 <span className="hint">(쉼표 구분)</span></label>
          <input value={f.foreignLanguages} onChange={(e) => set('foreignLanguages', e.target.value)} placeholder="예: TOEIC 850" />
        </div>
        <div className="form-field full">
          <label>동아리 <span className="hint">(쉼표 구분)</span></label>
          <input value={f.clubs} onChange={(e) => set('clubs', e.target.value)} placeholder="예: PULSE, 코딩동아리" />
        </div>
      </div>

      <div className="card-title" style={{ margin: '18px 0 10px' }}>인턴십 이력
        <button type="button" className="btn btn-sm" style={{ marginLeft: 10 }} onClick={addInternship}>인턴십 추가</button>
      </div>
      {f.internships.length === 0 && <div className="muted" style={{ marginBottom: 8 }}>인턴십 이력이 없습니다. ‘인턴십 추가’로 입력하세요.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {f.internships.map((it, i) => (
          <div key={i} className="soft-card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>인턴십 {i + 1}</strong>
              <button type="button" className="text-link danger-text" onClick={() => removeInternship(i)}>삭제</button>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>유형</label>
                <select value={it.internshipType} onChange={(e) => setInternship(i, 'internshipType', e.target.value)}>
                  <option value="">선택</option>
                  {ENUMS.INTERNSHIP_TYPE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-field"><label>기업체명</label><input value={it.companyName} onChange={(e) => setInternship(i, 'companyName', e.target.value)} /></div>
              <div className="form-field"><label>기간(주)</label><input type="number" min="1" value={it.durationWeeks} onChange={(e) => setInternship(i, 'durationWeeks', e.target.value)} /></div>
              <div className="form-field"><label>연월일</label><input type="date" value={it.activityDate} onChange={(e) => setInternship(i, 'activityDate', e.target.value)} /></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, marginTop: 18 }}>
        {(['swPrograms', 'bootcampPrograms'] as const).map((group) => (
          <div key={group} className="soft-card" style={{ padding: 12 }}>
            <div className="card-head" style={{ marginBottom: 8 }}>
              <div className="card-title">{group === 'swPrograms' ? 'SW중심대학 사업' : '부트캠프 사업'}</div>
              <button type="button" className="btn btn-sm" onClick={() => addProgram(group)}>＋ 추가</button>
            </div>
            {f[group].length === 0 && <div className="muted" style={{ fontSize: 'calc(12px * var(--fs, 1))' }}>참여한 사업이 없습니다. ‘＋ 추가’로 입력하세요.</div>}
            {f[group].map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={v} onChange={(e) => setProgram(group, i, e.target.value)} placeholder="사업명" style={{ flex: 1 }} />
                <button type="button" className="btn btn-sm" onClick={() => removeProgram(group, i)}>삭제</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="form-actions" style={{ marginTop: 18 }}>
        <button type="button" className="btn" onClick={() => router.back()}>취소</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
      </div>
    </form>
  );
}
