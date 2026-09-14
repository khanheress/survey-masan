import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import { getRecallForm, saveRecallForm, RecallError } from '@/lib/recallStore.mjs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = await getDb();
    const forms = session.user.role === 'admin' ? await
    db.prepare('SELECT id FROM recall_forms ORDER BY created_at DESC, id').all() : await
    db.prepare('SELECT id FROM recall_forms WHERE created_by = ? ORDER BY created_at DESC, id').all(session.user.id);
    return NextResponse.json(await Promise.all(forms.map(async (form) => await getRecallForm(db, form.id))));
  } catch {
    return NextResponse.json({ error: 'Không thể tải danh sách Form Recall.' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await saveRecallForm(await getDb(), await request.json(), session.user), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RecallError ? error.message : 'Không thể tạo form.' }, { status: error.status || 400 });
  }
}
