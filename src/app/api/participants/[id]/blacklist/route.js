import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {setParticipantBlacklist} from '@/lib/participantBlacklist.mjs';
export async function PATCH(request,context){
 const session=await getServerSession(authOptions);if(!session)return NextResponse.json({error:'Vui lòng đăng nhập.'},{status:401});if(session.user.role!=='admin')return NextResponse.json({error:'Chỉ quản trị viên được thay đổi blacklist.'},{status:403});
 let body;try{body=await request.json();}catch{return NextResponse.json({error:'Thông tin không hợp lệ.'},{status:400});}
 try{const {id}=await context.params;const result=await setParticipantBlacklist(await getDb(),id,body?.blacklisted,session.user.id);return NextResponse.json(result,{status:result.status});}catch{return NextResponse.json({error:'Không thể cập nhật blacklist.'},{status:500});}
}
