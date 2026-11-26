import type { Answer } from '@/lib/career-survey';

/** 한 사람의 진로조사 응답(질문과 답). 진로조사 화면과 학생 상세가 같이 쓴다 */
export default function SurveyAnswers({ answers }: { answers: Answer[] }) {
  return (
    <dl className="survey-answers">
      {answers.map((a) => (
        <div key={a.q}><dt>{a.q}</dt><dd>{a.a}</dd></div>
      ))}
    </dl>
  );
}
