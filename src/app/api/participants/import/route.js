import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {parseParticipantWorkbook,importParticipants,IMPORT_HEADERS} from '@/lib/participantImport.mjs';
import ExcelJS from 'exceljs';
export const runtime='nodejs';
async function authorized(){const session=await getServerSession(authOptions);return !session?NextResponse.json({error:'Vui lòng đăng nhập.'},{status:401}):session.user.role!=='admin'?NextResponse.json({error:'Chỉ quản trị viên được nhập data.'},{status:403}):null;}
export async function GET(){
 const denied=await authorized();if(denied)return denied;
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Data');sheet.addRow(IMPORT_HEADERS);sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];sheet.columns.forEach(c=>{c.width=28;c.numFmt='@';});
 return new Response(await workbook.xlsx.writeBuffer(),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="mau-nhap-data.xlsx"','Cache-Control':'no-store'}});
}
export async function POST(request){
 const denied=await authorized();if(denied)return denied;
 if(Number(request.headers.get('content-length'))>2200000)return NextResponse.json({error:'File tối đa 2 MB.'},{status:413});
 let rows,commit;
 try{const data=await request.formData(),file=data.get('file');commit=data.get('commit')==='true';if(!file||typeof file.arrayBuffer!=='function'||!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Vui lòng chọn file .xlsx.');if(file.size>2000000)throw Error('File tối đa 2 MB.');rows=await parseParticipantWorkbook(Buffer.from(await file.arrayBuffer()));}catch(e){return NextResponse.json({error:e.message||'File không hợp lệ.'},{status:400});}
 try{return NextResponse.json(await importParticipants(await getDb(),rows,commit));}catch{return NextResponse.json({error:'Không thể nhập dữ liệu. Vui lòng thử lại.'},{status:500});}
}
