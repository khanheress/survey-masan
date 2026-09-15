export const QUESTION_TYPES = [
 ['short_text','Câu trả lời ngắn'],['long_text','Đoạn văn'],['multiple_choice','Một lựa chọn'],['checkbox','Nhiều lựa chọn'],['dropdown','Danh sách thả xuống'],['file','Tải tệp / Chụp ảnh'],['linear_scale','Thang điểm tuyến tính'],['rating','Đánh giá bằng biểu tượng'],['matrix_single','Lưới một lựa chọn'],['matrix_multi','Lưới nhiều lựa chọn'],['allocation','Phân bổ số lần'],['detail_followup','Ghi chi tiết theo đáp án đã chọn'],['date','Ngày'],['phone','Số điện thoại'],['email','Email']
];
export function newQuestion(type) {
 return {id:`field_${crypto.randomUUID()}`,type,label:'Câu hỏi mới',required:false,options:['Lựa chọn 1','Lựa chọn 2'],rows:['Hàng 1','Hàng 2'],columns:['Cột 1','Cột 2'],total:10,min:1,max:5,minLabel:'Thấp nhất',maxLabel:'Cao nhất',ratingIcon:'star',rules:[]};
}
export function newSection() {return {id:`section_${crypto.randomUUID()}`,type:'section',label:'Phần mới',description:'',after:'next',visibility:[]};}
export function ensureSections(fields) {return fields[0]?.type === 'section' ? fields : [{...newSection(),label:'Câu hỏi chung'},...fields];}
export function splitSections(fields) {
 const result=[];
 for(const field of fields) {
  if(field.type==='section')result.push({section:field,questions:[]});
  else result.at(-1)?.questions.push(field);
 }
 return result;
}
export function duplicateItems(items) {
 const map=new Map(items.map(f=>[f.id,`${f.type==='section'?'section':'field'}_${crypto.randomUUID()}`]));
 return items.map(f=>{
  const copy=JSON.parse(JSON.stringify(f));copy.id=map.get(f.id);
  if(copy.purpose==='bumo')delete copy.purpose;
  copy.label=copy.label.replace(/\{\{q:([^{}]+)\}\}/g,(_,id)=>`{{q:${map.get(id)||id}}}`);
  if(copy.type==='section')copy.label+=' (bản sao)';
  if(copy.description)copy.description=copy.description.replace(/\{\{q:([^{}]+)\}\}/g,(_,id)=>`{{q:${map.get(id)||id}}}`);
  if(copy.after)copy.after=map.get(copy.after)||copy.after;
  if(copy.sourceId)copy.sourceId=map.get(copy.sourceId)||copy.sourceId;
  if(copy.rules)copy.rules=copy.rules.map(r=>({...r,target:map.get(r.target)||r.target}));
  if(copy.visibility)copy.visibility=copy.visibility.map(g=>g.map(c=>({...c,questionId:map.get(c.questionId)||c.questionId})));
  return copy;
 });
}
export function referencesAny(fields, removedIds) {
 return fields.filter(f=>!removedIds.has(f.id)).some(f=>removedIds.has(f.after)||removedIds.has(f.sourceId)||f.rules?.some(r=>removedIds.has(r.target))||f.visibility?.some(g=>g.some(c=>removedIds.has(c.questionId)))||[f.label,f.description].some(text=>text && [...text.matchAll(/\{\{q:([^{}]+)\}\}/g)].some(m=>removedIds.has(m[1]))));
}
