'use client';
import { useRef, useState } from 'react';
import { FILE_LIMIT, FILE_MIMES } from '@/lib/surveyAdvanced.mjs';
export default function SurveyFileInput({value,onChange}) {
 const [error,setError]=useState(''),[loading,setLoading]=useState(false),input=useRef(null),camera=useRef(null);
 const choose=async file=>{
  if(!file)return;setError('');setLoading(true);onChange({kind:'uploading'});
  try{
   if(!FILE_MIMES.includes(file.type))throw Error('Chọn ảnh JPG, PNG, WebP hoặc PDF.');
   let blob=file,name=file.name;
   if(file.type.startsWith('image/')&&file.size>FILE_LIMIT){
    const bitmap=await createImageBitmap(file);const ratio=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.75));name=file.name.replace(/\.[^.]+$/,'')+'.jpg';
   }
   if(!blob||!blob.size||blob.size>FILE_LIMIT)throw Error('Tệp tối đa 512 KB. Vui lòng chọn tệp nhỏ hơn.');
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Không thể đọc tệp.'));reader.readAsDataURL(blob);});
   onChange({kind:'file',name:name.slice(0,200),mime:blob.type,size:blob.size,data});
  }catch(e){setError(e.message);onChange(null);}finally{setLoading(false);if(input.current)input.current.value='';if(camera.current)camera.current.value='';}
 };
 return <div>
  <p className="survey-flow-note">Ảnh hoặc PDF, tối đa 512 KB/tệp. Tổng tệp của một phiếu tối đa 1 MB. Ảnh lớn được thu nhỏ trước khi gửi.</p>
  <input ref={input} type="file" className="sr-only" aria-label="Chọn tệp đính kèm" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={loading} onChange={e=>choose(e.target.files?.[0])}/>
  <input ref={camera} type="file" className="sr-only" aria-label="Chụp ảnh đính kèm" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={loading} onChange={e=>choose(e.target.files?.[0])}/>
  <div className="file-question-actions"><button type="button" className="btn btn-secondary" disabled={loading} onClick={()=>input.current.click()}>Tải tệp</button><button type="button" className="btn btn-secondary" disabled={loading} onClick={()=>camera.current.click()}>Chụp ảnh</button>{value?.kind==='file'&&<button type="button" className="btn btn-ghost" onClick={()=>onChange(null)}>Bỏ tệp</button>}</div>
  {loading?<p role="status">Đang xử lý tệp…</p>:value?.kind==='file'?<p>{value.name} · {Math.ceil(value.size/1024)} KB</p>:null}
  {error&&<p role="alert" style={{color:'var(--danger)'}}>{error}</p>}
 </div>;
}
