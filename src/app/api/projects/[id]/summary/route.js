import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {summaryConfig,saveSummaryTemplate,getParticipantSummary} from '@/lib/participantSummary.mjs';
export async function GET(request,context){
 if(!await getServerSession(authOptions))return NextResponse.json({error:'Vui lòng đăng nhập.'},{status:401});
 try{const {id}=await context.params,query=new URL(request.url).searchParams;const responseId=query.get('response_id'),participantId=query.get('participant_id');const db=await getDb();return NextResponse.json(responseId||participantId?await getParticipantSummary(db,id,{responseId,participantId}):await summaryConfig(db,id),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return NextResponse.json({error:e.status?e.message:'Không thể tải bản tóm tắt.'},{status:e.status||500});}
}
export async function PUT(request,context){
 const session=await getServerSession(authOptions);if(!session)return NextResponse.json({error:'Vui lòng đăng nhập.'},{status:401});if(session.user.role!=='admin')return NextResponse.json({error:'Chỉ quản trị viên được sửa mẫu.'},{status:403});
 try{const {id}=await context.params;return NextResponse.json({template:await saveSummaryTemplate(await getDb(),id,await request.json())});}catch(e){return NextResponse.json({error:e.status?e.message:'Không thể lưu mẫu.'},{status:e.status||500});}
}
