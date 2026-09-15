import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {validateProfileEdit,editParticipant} from '@/lib/participantEditing.mjs';
export async function PATCH(request,context){
 const session=await getServerSession(authOptions);
 if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(session.user.role!=='admin')return NextResponse.json({error:'Chỉ quản trị viên được chỉnh sửa hồ sơ.'},{status:403});
 try{const body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Thông tin không hợp lệ.'},{status:400});const checked=validateProfileEdit(body);if(checked.error)return NextResponse.json(checked,{status:400});const {id}=await context.params;const result=await editParticipant(await getDb(),id,checked.values);return NextResponse.json(result,{status:result.status});}catch{return NextResponse.json({error:'Không thể cập nhật hồ sơ.'},{status:500});}
}
