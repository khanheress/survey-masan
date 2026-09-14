import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { publicRecallForm, bookRecall, RecallError } from '@/lib/recallStore.mjs';

export async function GET(request, context) {
  try {
    const { token } = await context.params;
    return NextResponse.json(await publicRecallForm(await getDb(), token), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RecallError ? error.message : 'Không thể tải form.' }, { status: error.status || 500 });
  }
}

export async function POST(request, context) {
  try {
    const { token } = await context.params;
    return NextResponse.json(await bookRecall(await getDb(), token, await request.json()), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RecallError ? error.message : 'Không thể gửi đăng ký.' }, { status: error.status || 400 });
  }
}
