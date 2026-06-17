'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { toast } from '@/components/Toaster';
import { ENUMS } from '@/lib/enums';
import type { CounselingItem, ProgramMap } from '@/lib/student-shape';

export type FormInternship = { internshipType: string; companyName: string; durationWeeks: string; activityDate: string };

export type StudentFormData = {
  studentNo: string;
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
  graduationDate: string;
  employmentCompany: string;
  swPrograms: ProgramMap;
  bootcampPrograms: ProgramMap;
  counselings: CounselingItem[];
  internships: FormInternship[];
};

const EMPTY_PROGRAMS: ProgramMap = { program1: '', program2: '', program3: '', program4: '', program5: '' };

export const EMPTY_STUDENT: StudentFormData = {
  studentNo: '', name: '', department: '', major: '', grade: 1, gpa: '', careerGoal: '',
  phone: '', email: '', certificates: '', foreignLanguages: '', graduationDate: '', employmentCompany: '',
  swPrograms: { ...EMPTY_PROGRAMS }, bootcampPrograms: { ...EMPTY_PROGRAMS }, counselings: [], internships: [],
};

export default function StudentForm({ initial, mode }: { initial?: StudentFormData; mode: 'create' | 'edit' }) {
  const router = useRouter();
  const [f, setF] = useState<StudentFormData>(initial ?? EMPTY_STUDENT);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof StudentFormData, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const setProgram = (group: 'swPrograms' | 'bootcampPrograms', key: keyof ProgramMap, v: string) =>
    setF((p) => ({ ...p, [group]: { ...p[group], [key]: v } }));

  const addCounseling = () => setF((p) => (p.counselings.length >= 5 ? p : { ...p, counselings: [...p.counselings, { counselDate: '', counselor: '', content: '' }] }));
  const setCounseling = (i: number, key: keyof CounselingItem, v: string) =>
    setF((p) => ({ ...p, counselings: p.counselings.map((c, idx) => (idx === i ? { ...c, [key]: v } : c)) }));
  const removeCounseling = (i: number) => setF((p) => ({ ...p, counselings: p.counselings.filter((_, idx) => idx !== i) }));

  const addInternship = () => setF((p) => ({ ...p, internships: [...p.internships, { internshipType: '', companyName: '', durationWeeks: '', activityDate: '' }] }));
  const setInternship = (i: number, key: keyof FormInternship, v: string) =>
    setF((p) => ({ ...p, internships: p.internships.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)) }));
  const removeInternship = (i: number) => setF((p) => ({ ...p, internships: p.internships.filter((_, idx) => idx !== i) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.studentNo.trim() || !f.name.trim()) { toast('학번과 이름은 필수입니다.', 'error'); return; }
    const bad = f.counselings.find((c) => (c.counselDate || c.counselor || c.content) && !(c.counselDate && c.counselor && c.content));
    if (bad) { toast('상담은 일자·상담자·내용을 모두 입력해야 합니다.', 'error'); return; }

    const payload = {
      ...(mode === 'create' ? { studentNo: f.studentNo.trim() } : {}),
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
      graduationDate: f.graduationDate || null,
      employmentCompany: f.employmentCompany.trim() || null,
      swPrograms: f.swPrograms,
      bootcampPrograms: f.bootcampPrograms,
      counselings: f.counselings.filter((c) => c.counselDate || c.counselor || c.content),
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
        await api(`/api/students/${f.studentNo}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('수정되었습니다.', 'success');
        router.push(`/students/${f.studentNo}`);
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
          <input value={f.studentNo} disabled={mode === 'edit'} onChange={(e) => set('studentNo', e.target.value)} placeholder="예: 20201234" />
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
          <label>전화번호</label>
          <input value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="form-field">
          <label>이메일</label>
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
      </div>

      <div className="card-title" style={{ margin: '18px 0 10px' }}>진로지도 상담 <span className="muted" style={{ fontWeight: 400 }}>(최대 5)</span>
        <button type="button" className="btn btn-sm" style={{ marginLeft: 10 }} disabled={f.counselings.length >= 5} onClick={addCounseling}>상담 추가</button>
      </div>
      {f.counselings.length === 0 && <div className="muted" style={{ marginBottom: 8 }}>상담 내역이 없습니다. ‘상담 추가’로 입력하세요.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {f.counselings.map((c, i) => (
          <div key={i} className="soft-card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>상담 {i + 1}</strong>
              <button type="button" className="text-link danger-text" onClick={() => removeCounseling(i)}>삭제</button>
            </div>
            <div className="form-grid">
              <div className="form-field"><label>상담일자</label><input type="date" value={c.counselDate} onChange={(e) => setCounseling(i, 'counselDate', e.target.value)} /></div>
              <div className="form-field"><label>상담자</label><input value={c.counselor} onChange={(e) => setCounseling(i, 'counselor', e.target.value)} /></div>
              <div className="form-field full"><label>상담내역</label><textarea rows={3} value={c.content} onChange={(e) => setCounseling(i, 'content', e.target.value)} /></div>
            </div>
          </div>
        ))}
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
            <div className="card-title" style={{ marginBottom: 8 }}>{group === 'swPrograms' ? 'SW중심대학 사업' : '부트캠프 사업'}</div>
            {(['program1', 'program2', 'program3', 'program4', 'program5'] as (keyof ProgramMap)[]).map((k, i) => (
              <div key={k} className="form-field"><label>사업{i + 1}</label><input value={f[group][k]} onChange={(e) => setProgram(group, k, e.target.value)} /></div>
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
