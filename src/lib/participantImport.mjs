import ExcelJS from 'exceljs';
import {createHash} from 'node:crypto';
import {normalizePhone} from './participantStore.mjs';
import {INVITERS} from './respondent.mjs';
export const IMPORT_HEADERS=['Tên','Số điện thoại','Nghề nghiệp','Người mời','Dự án tham gia'];
const key=value=>String(value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/\s+/g,' ');
function cellText(cell){const value=cell.value;if(value==null)return '';if(typeof value==='object')throw Error('Chỉ nhập văn bản hoặc số, không dùng công thức, liên kết hay ô đặc biệt.');return String(value).trim();}
export async function parseParticipantWorkbook(buffer){
 const workbook=new ExcelJS.Workbook();try{await workbook.xlsx.load(buffer);}catch{throw Error('Không đọc được file Excel. Hãy chọn file .xlsx hợp lệ.');}
 const sheet=workbook.worksheets[0];if(!sheet)throw Error('File không có trang dữ liệu.');
 if(sheet.rowCount>1001||sheet.columnCount>50)throw Error('Mỗi file tối đa 1.000 dòng dữ liệu và 50 cột.');
 const headers=new Map();sheet.getRow(1).eachCell((cell,index)=>{const name=key(cellText(cell));if(headers.has(name))throw Error('Tên cột bị trùng.');headers.set(name,index);});
 const columns=IMPORT_HEADERS.map(label=>headers.get(key(label))||(label==='Nghề nghiệp'?headers.get(key('Nghề nghiệp hiện tại')):undefined));
 if(columns.slice(0,4).some(c=>!c))throw Error('Thiếu cột bắt buộc: Tên, Số điện thoại, Nghề nghiệp, Người mời.');
 const rows=[];
 for(let n=2;n<=sheet.rowCount;n++){
  const row=sheet.getRow(n);if(!row.hasValues)continue;
  try{const values=columns.map(c=>c?cellText(row.getCell(c)):'');if(values.every(v=>!v))continue;
   const [name,rawPhone,occupation,rawInviter,project]=values;
   const phone=normalizePhone(rawPhone),inviter=INVITERS.find(v=>key(v)===key(rawInviter));
   if(!name||!occupation||!rawPhone||!rawInviter)throw Error('Thiếu tên, số điện thoại, nghề nghiệp hoặc người mời.');
   if(name.length>200||occupation.length>200||project.length>200)throw Error('Tên, nghề nghiệp và dự án tối đa 200 ký tự.');
   if(!/^0\d{9,10}$/.test(phone))throw Error('Số điện thoại không hợp lệ. Định dạng cột là Văn bản để giữ số 0 đầu.');
   if(!inviter)throw Error('Người mời phải là Khánh hoặc Tế.');
   rows.push({row:n,name,phone,occupation,inviter,project});
  }catch(e){rows.push({row:n,error:e.message});}
 }
 if(!rows.length)throw Error('File chưa có dữ liệu.');return rows;
}
export async function importParticipants(db,rows,commit=false){
 return db.transaction(async()=>{
  const existing=new Set((await db.prepare('SELECT phone FROM participants WHERE phone IS NOT NULL').all()).map(p=>normalizePhone(p.phone)));
  const projects=await db.prepare('SELECT id,name FROM projects').all();const seen=new Set();const result=[];let added=0;
  for(const row of rows){
   if(row.error){result.push({...row,status:'error'});continue;}
   if(existing.has(row.phone)||seen.has(row.phone)){result.push({...row,status:'skip',message:'Số điện thoại đã có; bỏ qua toàn bộ dòng.'});continue;}
   const matches=row.project?projects.filter(p=>key(p.name)===key(row.project)):[];
   if(matches.length>1){result.push({...row,status:'error',error:'Có nhiều dự án cùng tên. Hãy đổi tên dự án để xác định đúng.'});continue;}
   seen.add(row.phone);result.push({...row,status:'ready'});
   if(!commit)continue;
   const id=`phone:${row.phone}`,now=new Date().toISOString();
   const profile={respondent_name:row.name,respondent_phone:row.phone,respondent_occupation:row.occupation,respondent_inviter:row.inviter};
   await db.prepare('INSERT INTO participants (id,phone,name,profile_json,first_seen,last_seen) VALUES (?,?,?,?,?,?)').run(id,row.phone,row.name,JSON.stringify(profile),now,now);
   if(row.project){const project=matches[0];const historyId='import:'+createHash('sha256').update(id+'|'+row.project).digest('hex');await db.prepare('INSERT INTO participant_history (response_id,participant_id,project_id,project_name,survey_id,survey_title,inviter,submitted_at) VALUES (?,?,?,?,NULL,?,?,?)').run(historyId,id,project?.id||null,project?.name||row.project,'Nhập từ Excel',row.inviter,now);}
   added++;
  }
  return {rows:result,added,valid:result.filter(r=>r.status==='ready').length,skipped:result.filter(r=>r.status==='skip').length,errors:result.filter(r=>r.status==='error').length};
 })();
}
