export const MAX_RECALL_SLOTS=500;
function minutes(value){if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Giờ phải có định dạng hợp lệ.');const [h,m]=value.split(':').map(Number);return h*60+m;}
export function generateRecallSchedule(config){
 if(!config||!Array.isArray(config.dates)||!config.dates.length)throw Error('Hãy chọn ít nhất một ngày đăng ký.');
 if(config.dates.length>500)throw Error('Số ngày đăng ký quá nhiều.');
 const dates=[...new Set(config.dates)].sort();
 for(const date of dates){if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Ngày đăng ký không hợp lệ.');const parsed=new Date(date+'T00:00:00Z');if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw Error('Ngày đăng ký không tồn tại.');}
 const start=minutes(config.start),end=minutes(config.end);
 if(end<start)throw Error('Giờ kết thúc phải từ giờ bắt đầu trở đi trong cùng ngày.');
 if(!Number.isInteger(config.interval)||config.interval<1||config.interval>1440)throw Error('Khoảng cách phải là số nguyên từ 1 đến 1.440 phút.');
 if(!Array.isArray(config.breaks)||config.breaks.length>20)throw Error('Tối đa 20 khoảng nghỉ.');
 const breaks=config.breaks.map(b=>{const from=minutes(b?.start),to=minutes(b?.end);if(to<=from)throw Error('Giờ kết thúc nghỉ phải sau giờ bắt đầu nghỉ.');return [from,to];});
 const times=[];for(let time=start;time<=end;time+=config.interval){if(breaks.some(([from,to])=>time>=from&&time<to))continue;times.push(`${String(Math.floor(time/60)).padStart(2,'0')}:${String(time%60).padStart(2,'0')}`);}
 if(!times.length)throw Error('Không còn khung giờ nào sau khi loại khoảng nghỉ.');
 if(dates.length*times.length>MAX_RECALL_SLOTS)throw Error('Tối đa 500 khung giờ mỗi form. Hãy giảm số ngày hoặc tăng khoảng cách.');
 return dates.flatMap(date=>times.map(time=>`${date}T${time}`));
}
export function resolveRecallSchedule(config,existing=[]){
 const generated=generateRecallSchedule(config);
 const booked=existing.filter(s=>s.booked_count>0).map(s=>s.starts_at);
 const slots=[...new Set([...generated,...booked])].sort();
 if(slots.length>MAX_RECALL_SLOTS)throw Error('Tổng giờ mới và giờ đã có đăng ký vượt 500 khung giờ.');
 return {slots,preserved:booked.filter(s=>!generated.includes(s))};
}
