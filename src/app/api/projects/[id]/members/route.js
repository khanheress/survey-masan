import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {listProjectMembers,reviewProjectMember} from '@/lib/projectMembers.mjs';
export async function GET(request,context){
 if(!await getServerSession(authOptions))return NextResponse.json({error:'Vui lòng đăng nhập.'},{status:401});
 try{const {id}=await context.params;return NextResponse.json(await listProjectMembers(await getDb(),id));}catch(e){return NextResponse.json({error:e.status?e.message:'Không thể tải danh sách.'},{status:e.status||500});}
}
export async function PATCH(request,context){
 const session=await getServerSession(authOptions);if(!session)return NextResponse.json({error:'Vui lòng đăng nhập.'},{status:401});if(session.user.role!=='admin')return NextResponse.json({error:'Chỉ quản trị viên được duyệt tham gia.'},{status:403});
 try{const {id}=await context.params;return NextResponse.json(await reviewProjectMember(await getDb(),id,await request.json(),session.user.id));}catch(e){return NextResponse.json({error:e.status?e.message:'Không thể cập nhật trạng thái.'},{status:e.status||500});}
}
