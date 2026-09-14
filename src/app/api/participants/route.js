import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import { listParticipants } from '@/lib/participantStore.mjs';
import { RESPONDENT_FIELDS } from '@/lib/respondent.mjs';
import Papa from 'papaparse';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const exportAll = params.get('format') === 'csv';
    const result = listParticipants(getDb(), {
      search: params.get('search') || '', projectId: params.get('project_id') || '',
      inviter: params.get('inviter') || '', page: params.get('page'), exportAll,
    });
    if (!exportAll) return NextResponse.json(result);
    const headers = [...RESPONDENT_FIELDS.map(field => field.label), 'Dự án đã tham gia', 'Số lần tham gia', 'Tham gia lần đầu', 'Tham gia gần nhất'];
    const rows = result.participants.map(person => [
      ...RESPONDENT_FIELDS.map(field => person[field.key] ?? ''),
      person.projects.map(project => project.name).join('; '), person.history.length, person.first_seen, person.last_seen,
    ]);
    const csv = Papa.unparse({ fields: headers, data: rows }, { escapeFormulae: true });
    return new NextResponse('\uFEFF' + csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="quan-ly-data.csv"',
    } });
  } catch {
    return NextResponse.json({ error: 'Không thể tải dữ liệu người tham gia' }, { status: 500 });
  }
}
