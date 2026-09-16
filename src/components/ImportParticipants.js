'use client';
import {useState} from 'react';
import Modal from './Modal';
export default function ImportParticipants({onClose,onSaved}){
 const [file,setFile]=useState(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 async function upload(commit=false){setBusy(true);setError('');try{const body=new FormData();body.set('file',file);body.set('commit',String(commit));const response=await fetch('/api/participants/import',{method:'POST',body});const data=await response.json();if(!response.ok)throw Error(data.error||'Không thể nhập file.');setResult(data);if(commit){setDone(true);onSaved(data);}}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <Modal isOpen onClose={()=>{if(!busy)onClose();}} title="Nhập data từ Excel" size="lg">
  <p className="form-hint">Trang đầu tiên có hàng tiêu đề: Tên, Số điện thoại, Nghề nghiệp, Người mời, Dự án tham gia. Bốn mục đầu bắt buộc; dự án có thể để trống. Người mời: Khánh hoặc Tế.</p>
  <p className="form-hint">Đặt cột số điện thoại thành Văn bản để giữ số 0 đầu. Mỗi dòng một hồ sơ, tối đa 1.000 dòng / 2 MB. Số điện thoại trùng sẽ được bỏ qua, không ghi đè hồ sơ.</p>
  <p className="form-hint">Dự án trùng tên sẽ được liên kết; tên dự án cũ chưa có được lưu vào lịch sử. Nhập data không tạo phản hồi khảo sát hay tự duyệt tham gia dự án.</p>
  <a className="btn btn-secondary btn-sm" href="/api/participants/import" download>Tải file mẫu .xlsx</a>
  <div className="form-group" style={{marginTop:16}}><label className="form-label" htmlFor="data-xlsx">File Excel .xlsx</label><input id="data-xlsx" className="form-input" type="file" accept=".xlsx" disabled={busy} onChange={e=>{setFile(e.target.files[0]||null);setResult(null);setError('');setDone(false);}}/></div>
  {error&&<p role="alert" className="recall-error">{error}</p>}
  {result&&<><p role="status">{done?`Đã thêm ${result.added} hồ sơ`:`${result.valid} hồ sơ có thể nhập`} · {result.skipped} dòng trùng · {result.errors} dòng lỗi</p><div style={{overflow:'auto',maxHeight:350,margin:'16px 0'}}><table className="data-table"><thead><tr><th>Dòng</th><th>Tên</th><th>Số điện thoại</th><th>Nghề nghiệp</th><th>Người mời</th><th>Dự án</th><th>Kết quả</th></tr></thead><tbody>{result.rows.map(r=><tr key={r.row}><td>{r.row}</td><td>{r.name||'—'}</td><td>{r.phone||'—'}</td><td>{r.occupation||'—'}</td><td>{r.inviter||'—'}</td><td>{r.project||'—'}</td><td>{r.error||r.message||(done?'Đã thêm':'Sẵn sàng')}</td></tr>)}</tbody></table></div>{!done&&result.errors>0&&<p className="form-hint">Chỉ nhập các dòng hợp lệ. Sửa các dòng lỗi trong file rồi nhập lại; hồ sơ đã nhập sẽ được bỏ qua.</p>}</>}
  <div className="recall-actions"><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Đóng</button>{!done&&<button className="btn btn-primary" disabled={busy||!file||Boolean(result&&!result.valid)} onClick={()=>upload(Boolean(result))}>{busy?'Đang xử lý…':result?`Nhập ${result.valid} hồ sơ hợp lệ`:'Kiểm tra và xem trước'}</button>}</div>
 </Modal>;
}
