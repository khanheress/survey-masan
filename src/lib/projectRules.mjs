export function emptyProjectRules(){return {gender:{enabled:false,quotas:{Nam:null,'Nữ':null}},age:{enabled:false,bands:[]},bumo:{enabled:false,products:[]}};}
export function parseProjectRules(value){if(!value)return emptyProjectRules();const parsed=typeof value==='string'?JSON.parse(value):value;return Object.keys(parsed).length?parsed:emptyProjectRules();}
const quotaOK=v=>v===null||(Number.isInteger(v)&&v>=0&&v<=1000000);
export function validateProjectRules(rules){
 if(!rules||typeof rules!=='object')return 'Điều kiện dự án không hợp lệ.';
 for(const key of ['gender','age','bumo'])if(!rules[key]||typeof rules[key].enabled!=='boolean')return 'Cấu hình điều kiện dự án không hợp lệ.';
 if(rules.gender.enabled&&(!rules.gender.quotas||!['Nam','Nữ'].every(k=>quotaOK(rules.gender.quotas[k]))))return 'Chỉ tiêu giới tính phải là số nguyên từ 0 trở lên; để trống nếu không giới hạn.';
 if(rules.age.enabled){
  if(!Array.isArray(rules.age.bands)||!rules.age.bands.length||rules.age.bands.some(b=>!b||typeof b!=='object'))return 'Hãy thêm ít nhất một nhóm tuổi.';
  const sorted=[...rules.age.bands].sort((a,b)=>a.min-b.min);
  for(let i=0;i<sorted.length;i++){const b=sorted[i];if(!Number.isInteger(b.min)||!Number.isInteger(b.max)||b.min<0||b.max>130||b.min>b.max||!quotaOK(b.quota)||(i&&b.min<=sorted[i-1].max))return 'Nhóm tuổi phải từ 0–130, không trùng nhau và có chỉ tiêu hợp lệ.';}
 }
 if(rules.bumo.enabled&&(!Array.isArray(rules.bumo.products)||!rules.bumo.products.length||rules.bumo.products.some(p=>!p||typeof p.name!=='string'||!p.name.trim()||!quotaOK(p.quota))||new Set(rules.bumo.products.map(p=>p.name)).size!==rules.bumo.products.length))return 'Hãy nhập sản phẩm BUMO không trùng nhau và chỉ tiêu hợp lệ.';
 return null;
}
export function vietnamYear(now=new Date()){return Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(now));}
export function bumoQuestion(fields){return fields.find(f=>f.purpose==='bumo');}
export function checkEligibility(rules,profile,answers={},fields=[],counts={},now=new Date()){
 const age=vietnamYear(now)-Number(profile.respondent_birth_year),gender=profile.respondent_gender;
 const fail=reason=>({eligible:false,reason,message:`Nhóm tham gia của bạn chưa phù hợp hoặc đã đủ số lượng. Vui lòng liên hệ lại với người mời khảo sát${profile.respondent_inviter ? ` (${profile.respondent_inviter})` : ''} để được hướng dẫn.`});
 if(rules.gender.enabled){const quota=rules.gender.quotas[gender];if(quota!==null&&(counts.gender?.[gender]||0)>=quota)return fail('gender_quota');}
 let band=null;
 if(rules.age.enabled){band=rules.age.bands.find(b=>age>=b.min&&age<=b.max);if(!band)return fail('age_condition');if(band.quota!==null&&(counts.age?.[`${band.min}-${band.max}`]||0)>=band.quota)return fail('age_quota');}
 let bumo=[];
 if(rules.bumo.enabled){
  const question=bumoQuestion(fields);if(!question)return {...fail('bumo_configuration'),message:'Khảo sát chưa được thiết lập câu hỏi BUMO. Vui lòng liên hệ người tạo khảo sát.'};
  const answer=answers[question.id];if(answer===undefined||answer===null||answer===''||(Array.isArray(answer)&&!answer.length))return {eligible:null};const selected=Array.isArray(answer)?answer:[answer];bumo=rules.bumo.products.filter(p=>selected.includes(p.name)).map(p=>p.name);
  if(!bumo.length)return fail('bumo_condition');
  if(bumo.some(name=>{const q=rules.bumo.products.find(p=>p.name===name).quota;return q!==null&&(counts.bumo?.[name]||0)>=q;}))return fail('bumo_quota');
 }
 return {eligible:true,age,bumo};
}
export async function projectQuotaCounts(db,projectId,rules){
 const rows=await db.prepare('SELECT respondent_gender, respondent_birth_year, respondent_age, respondent_bumo, created_at FROM responses WHERE project_id = ?').all(projectId);
 const counts={total:rows.length,gender:{Nam:0,'Nữ':0},age:{},bumo:Object.create(null)};
 for(const row of rows){
  if(['Nam','Nữ'].includes(row.respondent_gender))counts.gender[row.respondent_gender]++;
  const age=row.respondent_age??(Number(String(row.created_at).slice(0,4))-Number(row.respondent_birth_year));
  for(const band of rules.age.bands||[])if(age>=band.min&&age<=band.max){const k=`${band.min}-${band.max}`;counts.age[k]=(counts.age[k]||0)+1;}
  let products=[];try{products=JSON.parse(row.respondent_bumo||'[]');}catch{}
  for(const name of (Array.isArray(products)?products:[]))counts.bumo[name]=(counts.bumo[name]||0)+1;
 }
 return counts;
}
export async function migrateProjectRules(db){
 await db.transaction(async()=>{
  const columns=new Set((await db.prepare('PRAGMA table_info(projects)').all()).map(c=>c.name));
  if(!columns.has('rules_json'))await db.exec("ALTER TABLE projects ADD COLUMN rules_json TEXT NOT NULL DEFAULT '{}'");
 })();
}
