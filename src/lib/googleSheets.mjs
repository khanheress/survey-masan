export const GOOGLE_SHEETS_SCOPE='https://www.googleapis.com/auth/drive.file';
export function googleSheetBody(title,values){
 if(!Array.isArray(values)||!values.length||!Array.isArray(values[0])||!values[0].length)throw Error('Không có dữ liệu để xuất.');
 const columnCount=Math.max(26,values[0].length),rowCount=Math.max(100,values.length);
 if(columnCount*rowCount>10000000)throw Error('Dữ liệu vượt giới hạn Google Sheets. Hãy chọn ít mục hơn hoặc xuất Excel.');
 const rows=values.map(row=>({values:row.map(value=>{
  if(typeof value==='number'&&Number.isFinite(value))return {userEnteredValue:{numberValue:value}};
  const text=String(value??'');if(text.length>50000)throw Error('Có câu trả lời quá dài cho một ô Google Sheets. Hãy bỏ mục đó hoặc xuất Excel.');
  return {userEnteredValue:{stringValue:text}};
 })}));
 const body={properties:{title:String(title).slice(0,200),locale:'vi_VN',timeZone:'Asia/Ho_Chi_Minh'},sheets:[{properties:{title:'Phản hồi',gridProperties:{rowCount,columnCount,frozenRowCount:1}},data:[{startRow:0,startColumn:0,rowData:rows}]}]};
 if(new TextEncoder().encode(JSON.stringify(body)).length>8000000)throw Error('Dữ liệu quá lớn để xuất một lần. Hãy chọn ít mục hơn hoặc xuất Excel.');
 return body;
}
export async function createGoogleSheet(accessToken,title,values,fetcher=fetch){
 const body=googleSheetBody(title,values);let response;
 try{response=await fetcher('https://sheets.googleapis.com/v4/spreadsheets',{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify(body)});}catch{throw Error('Kết nối Google bị gián đoạn. Hãy kiểm tra Google Drive xem tệp đã được tạo chưa trước khi xuất lại.');}
 if(response.status===401)throw Error('Phiên Google đã hết hạn. Vui lòng đăng nhập Google và xuất lại.');
 if(response.status===403)throw Error('Google chưa cho phép tạo bảng tính. Hãy kiểm tra quyền đã cấp và cấu hình Google Sheets API.');
 if(!response.ok)throw Error('Google không thể tạo bảng tính lúc này. Vui lòng thử lại sau.');
 const data=await response.json();if(!/^[a-zA-Z0-9_-]+$/.test(data.spreadsheetId||''))throw Error('Không nhận được đường dẫn bảng tính. Vui lòng kiểm tra Google Drive.');
 return `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`;
}
