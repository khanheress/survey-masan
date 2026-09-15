import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getDb } from '@/lib/db';
import { exportColumns, exportValue } from '@/lib/projectExport.mjs';
export const runtime='nodejs';
async function load(context){
 const db=await getDb();const {id}=await context.params;
 const project=await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);if(!project)return null;
 const surveys=await db.prepare('SELECT * FROM surveys WHERE project_id = ? ORDER BY created_at, id').all(id);
 const rows=await db.prepare('SELECT r.*, s.title AS survey_title, p.name AS project_name FROM responses r LEFT JOIN surveys s ON s.id = r.survey_id LEFT JOIN projects p ON p.id = r.project_id WHERE r.project_id = ? ORDER BY r.created_at, r.id').all(id);
 return {project,rows,columns:exportColumns(surveys,rows)};
}
export async function GET(request,context){
 if(!await getServerSession(authOptions))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const data=await load(context);if(!data)return NextResponse.json({error:'Không tìm thấy dự án'},{status:404});return NextResponse.json({columns:data.columns,total:data.rows.length,google_client_id:process.env.GOOGLE_CLIENT_ID||''},{headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'Không thể tải danh sách mục xuất.'},{status:500});}
}
export async function POST(request,context){
 if(!await getServerSession(authOptions))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
 const body=await request.json();const data=await load(context);if(!data)return NextResponse.json({error:'Không tìm thấy dự án'},{status:404});
 if(!Array.isArray(body.columns)||!body.columns.length||body.columns.length>16384||new Set(body.columns).size!==body.columns.length)return NextResponse.json({error:'Hãy chọn các mục cần xuất.'},{status:400});
 const columns=body.columns.map(key=>data.columns.find(c=>c.key===key));if(columns.some(c=>!c))return NextResponse.json({error:'Danh sách mục đã thay đổi. Vui lòng mở lại cửa sổ xuất.'},{status:400});
 if(body.format==='google')return NextResponse.json({title:`${data.project.name} - Phản hồi`,values:[columns.map(c=>c.label),...data.rows.map(row=>columns.map(c=>exportValue(row,c)))]},{headers:{'Cache-Control':'private, no-store'}});
 const workbook=new ExcelJS.Workbook();workbook.creator='SurveyPro';
 const sheet=workbook.addWorksheet('Phản hồi',{views:[{state:'frozen',ySplit:1}]});
 sheet.columns=columns.map(c=>({header:c.label,key:c.key,width:c.questionId?45:25}));
 for(const row of data.rows)sheet.addRow(columns.map(c=>exportValue(row,c)));
 sheet.getRow(1).font={bold:true,color:{argb:'FF1E293B'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE2E8F0'}};sheet.getRow(1).height=40;
 sheet.eachRow(row=>{row.alignment={vertical:'top',wrapText:true};});sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:columns.length}};
 return new Response(await workbook.xlsx.writeBuffer(),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="project-responses.xlsx"','Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Không thể xuất Excel. Vui lòng thử lại.'},{status:500});}
}
