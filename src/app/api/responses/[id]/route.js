import {REVIEW_LABELS} from '@/lib/responseReview.mjs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
    if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Chỉ quản trị viên được xóa phản hồi.' }, { status: 403 });
    const { id } = await context.params;
    const db = await getDb();
    // Keep the participant archive, just as deleting a survey or project does.
    const result = await db.prepare('DELETE FROM responses WHERE id = ?').run(id);
    if (!result.changes) return NextResponse.json({ error: 'Phản hồi không còn tồn tại.' }, { status: 404 });
    return NextResponse.json({ message: 'Đã xóa phản hồi.' });
  } catch {
    return NextResponse.json({ error: 'Không thể xóa phản hồi. Vui lòng thử lại.' }, { status: 500 });
  }
}

export async function PATCH(request,context){
 const session=await getServerSession(authOptions);
 if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(session.user.role!=='admin')return NextResponse.json({error:'Chỉ quản trị viên được duyệt phản hồi.'},{status:403});
 try{
  const body=await request.json();
  if(typeof body?.review_status!=='string'||!Object.hasOwn(REVIEW_LABELS,body.review_status))return NextResponse.json({error:'Trạng thái duyệt không hợp lệ.'},{status:400});
  const {id}=await context.params;const db=await getDb();
  const result=await db.prepare('UPDATE responses SET review_status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?').run(body.review_status,session.user.id,id);
  if(!result.changes)return NextResponse.json({error:'Không tìm thấy phản hồi.'},{status:404});
  return NextResponse.json({id,review_status:body.review_status});
 }catch{return NextResponse.json({error:'Không thể cập nhật trạng thái duyệt.'},{status:500});}
}
