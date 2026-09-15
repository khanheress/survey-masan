import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import { validateAdvancedAnswer } from '@/lib/surveyAdvanced.mjs';

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
    const { id, fieldId } = await context.params;
    const db = await getDb();
    const row = await db.prepare('SELECT data_json FROM responses WHERE id = ?').get(id);
    const answers = row ? JSON.parse(row.data_json || '{}') : {};
    const file = Object.hasOwn(answers, fieldId) ? answers[fieldId] : null;
    if (!file || validateAdvancedAnswer({ type: 'file', label: 'Tệp' }, file, {})) return NextResponse.json({ error: 'Không tìm thấy tệp.' }, { status: 404 });
    const filename = encodeURIComponent(file.name).replace(/['()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    return new NextResponse(Buffer.from(file.data, 'base64'), { headers: {
      'Content-Type': file.mime,
      'Content-Disposition': `attachment; filename="attachment"; filename*=UTF-8''${filename}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    } });
  } catch { return NextResponse.json({ error: 'Không thể tải tệp.' }, { status: 500 }); }
}
