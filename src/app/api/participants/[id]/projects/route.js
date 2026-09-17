import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {removeParticipantProject} from '@/lib/participantProjects.mjs';
export async function DELETE(request,context){
 const session=await getServerSession(authOptions);if(!session)return NextResponse.json({error:'Vui lòng đăng nhập.'},{status:401});if(session.user.role!=='admin')return NextResponse.json({error:'Chỉ quản trị viên được gỡ dự án khỏi hồ sơ.'},{status:403});
 let input;try{input=await request.json();}catch{return NextResponse.json({error:'Thông tin không hợp lệ.'},{status:400});}
 try{const {id}=await context.params;const result=await removeParticipantProject(await getDb(),id,input);return NextResponse.json(result,{status:result.status});}catch{return NextResponse.json({error:'Không thể gỡ dự án. Vui lòng thử lại.'},{status:500});}
}
