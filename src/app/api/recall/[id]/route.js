import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import { getRecallForm, saveRecallForm, canManageRecall, RecallError } from '@/lib/recallStore.mjs';
import Papa from 'papaparse';

export async function GET(request, context) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await context.params;
    const db = getDb();
    const form = getRecallForm(db, id);
    if (!canManageRecall(form, session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const bookings = db.prepare('SELECT * FROM recall_bookings WHERE form_id = ? ORDER BY starts_at, created_at, id').all(id);
    if (new URL(request.url).searchParams.get('format') === 'csv') {
      const csv = Papa.unparse({ fields: ['Tên', 'Số điện thoại', 'Ngày đăng ký', 'Giờ đăng ký', 'Thời điểm gửi'],
        data: bookings.map(item => [item.name, item.phone, item.starts_at.slice(0,10), item.starts_at.slice(11), item.created_at]),
      }, { escapeFormulae: true });
      return new NextResponse('\uFEFF' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="recall.csv"' } });
    }
    return NextResponse.json({ ...form, bookings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RecallError ? error.message : 'Không thể tải form.' }, { status: error.status || 500 });
  }
}

export async function PUT(request, context) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await context.params;
    return NextResponse.json(saveRecallForm(getDb(), await request.json(), session.user, id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof RecallError ? error.message : 'Không thể cập nhật form.' }, { status: error.status || 400 });
  }
}
