import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {copyProject} from '@/lib/projectCopy.mjs';
export async function POST(request,context){
 const session=await getServerSession(authOptions);if(!session)return NextResponse.json({error:'Vui lòng đăng nhập.'},{status:401});if(session.user.role!=='admin')return NextResponse.json({error:'Chỉ quản trị viên được sao chép dự án.'},{status:403});
 let input;try{input=await request.json();}catch{return NextResponse.json({error:'Thông tin không hợp lệ.'},{status:400});}
 try{const {id}=await context.params;return NextResponse.json(await copyProject(await getDb(),id,input,session.user.id),{status:201});}catch(e){return NextResponse.json({error:e.status?e.message:'Không thể sao chép dự án. Vui lòng thử lại.'},{status:e.status||500});}
}
