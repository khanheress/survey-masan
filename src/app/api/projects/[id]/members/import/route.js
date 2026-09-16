import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {parseParticipantWorkbook} from '@/lib/participantImport.mjs';
import {importProjectMembers} from '@/lib/projectMembers.mjs';
export const runtime='nodejs';
export async function POST(request,context){
 const session=await getServerSession(authOptions);if(!session)return NextResponse.json({error:'Vui lòng đăng nhập.'},{status:401});if(session.user.role!=='admin')return NextResponse.json({error:'Chỉ quản trị viên được nhập danh sách.'},{status:403});
 if(Number(request.headers.get('content-length'))>2200000)return NextResponse.json({error:'File tối đa 2 MB.'},{status:413});
 let rows,commit,reviewStatus;
 try{const form=await request.formData(),file=form.get('file');commit=form.get('commit')==='true';reviewStatus='approved';if(!file||typeof file.arrayBuffer!=='function'||!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Vui lòng chọn file .xlsx.');if(file.size>2000000)throw Error('File tối đa 2 MB.');rows=await parseParticipantWorkbook(Buffer.from(await file.arrayBuffer()));}catch(e){return NextResponse.json({error:e.message},{status:400});}
 try{const {id}=await context.params;return NextResponse.json(await importProjectMembers(await getDb(),id,rows,{commit,reviewStatus,userId:session.user.id}));}catch(e){return NextResponse.json({error:e.status?e.message:'Không thể nhập danh sách.'},{status:e.status||500});}
}
