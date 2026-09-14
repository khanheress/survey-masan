import { RESPONDENT_FIELDS } from '@/lib/respondent.mjs';

export default function RespondentDetails({ response }) {
  return (
    <dl className="respondent-details">
      {RESPONDENT_FIELDS.map(field => (
        <div key={field.key}>
          <dt>{field.label}</dt>
          <dd>{response[field.key] || 'Chưa cung cấp'}</dd>
        </div>
      ))}
      {response.respondent_email && <div><dt>Email</dt><dd>{response.respondent_email}</dd></div>}
      <div><dt>Ngày nộp</dt><dd>{new Date(response.created_at).toLocaleString('vi-VN')}</dd></div>
    </dl>
  );
}
