'use client';
import { useState } from 'react';
import SurveyQuestions from './SurveyQuestions';
import RespondentFields from './RespondentFields';
import { changeSurveyAnswer, evaluateSurvey, validateSurveyAnswers } from '@/lib/surveyFlow.mjs';
export default function SurveyFlowPreview({ fields }) {
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const flow = evaluateSurvey(fields, answers);
  return <div>
    <div className="survey-flow-note">Thử chọn câu trả lời để kiểm tra rẽ nhánh. Dữ liệu xem trước không được gửi.</div>
    <button type="button" className="btn btn-secondary" onClick={() => { setAnswers({}); setFinished(false); setMessage(''); }}>Làm lại bản xem trước</button>
    <RespondentFields disabled />
    {flow.status === 'invalid' ? <p role="alert">{flow.error}</p> : flow.status === 'screenout' ? <div role="status"><h3>Khảo sát đã kết thúc</h3><p>{flow.message}</p></div> : finished ? <p role="status">Hoàn tất bản xem trước. Không có phản hồi nào được lưu.</p> : <>
      <SurveyQuestions flow={flow} answers={answers} onChange={(id, value) => { setAnswers(changeSurveyAnswer(fields, answers, id, value)); setMessage(''); }} />
      <button type="button" className="btn btn-primary" disabled={flow.status !== 'complete'} onClick={() => {
        const result = validateSurveyAnswers(fields, answers);
        setMessage(result.error || '');
        if (!result.error) setFinished(true);
      }}>Thử hoàn tất</button>
      {message && <p role="alert">{message}</p>}
    </>}
  </div>;
}
