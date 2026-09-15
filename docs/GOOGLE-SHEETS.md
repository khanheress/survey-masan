# Bật xuất Google Sheets

Website đã có lựa chọn **Xuất dữ liệu (Excel / Google Sheets)** trong chi tiết dự án. Người dùng chọn các cột, đăng nhập tài khoản Google và cho phép tạo bảng tính trong tài khoản đó. Bảng tính mới gồm toàn bộ phản hồi của dự án, có thể chọn thêm cột Trạng thái tham gia.

## Cấu hình một lần

1. Mở [Google Cloud Console](https://console.cloud.google.com/), tạo hoặc chọn một project.
2. Trong **APIs & Services → Library**, tìm và bật **Google Sheets API**.
3. Trong **Google Auth Platform**, thiết lập thông tin ứng dụng (Branding), email hỗ trợ và Audience. Nếu ứng dụng ở chế độ Testing, thêm email của người sẽ thử xuất vào **Test users**.
4. Trong **Clients**, tạo **OAuth client ID**, loại **Web application**.
5. Thêm vào **Authorized JavaScript origins**:
   - `https://survey-masan.vercel.app`
   - Nếu thử trên máy, thêm đúng origin của máy, ví dụ `http://localhost:3000`.
   - Nếu dùng tên miền riêng, thêm origin của tên miền đó.
6. Sao chép **Client ID** (thường kết thúc bằng `.apps.googleusercontent.com`). Luồng này không dùng Client Secret hoặc redirect URI.
7. Trong dự án trên Vercel → **Settings → Environment Variables**, thêm `GOOGLE_CLIENT_ID` với Client ID vừa tạo cho môi trường Production; thêm Preview nếu cần thử bản preview và khai báo origin tương ứng trên Google.
8. Triển khai lại website. Mở một dự án → **Xuất dữ liệu (Excel / Google Sheets)** → chọn **Google Sheets**, chọn các mục → **Đăng nhập Google và xuất**.
9. Chọn tài khoản và cấp quyền. Sau khi thành công, nhấn **Mở Google Sheets**.

Nếu dùng cho người ngoài danh sách thử nghiệm, cần cấu hình Audience/Publishing status phù hợp và đáp ứng các yêu cầu Google hiển thị trong console.

## Quyền và dữ liệu

Ứng dụng chỉ yêu cầu scope `https://www.googleapis.com/auth/drive.file`, để tạo và làm việc với tệp do ứng dụng tạo/được người dùng cho phép. Token ngắn hạn chỉ dùng trong trình duyệt khi xuất; không lưu vào database, cookie hay bộ nhớ lâu dài, và không gửi token đến máy chủ ứng dụng. Đăng nhập Google phục vụ thao tác xuất, không thay thế tài khoản đăng nhập quản trị.

Nội dung bắt đầu bằng dấu `=` được ghi như văn bản để không bị chạy thành công thức. Tệp đính kèm chỉ xuất tên, không đưa dữ liệu tệp vào ô. Dữ liệu quá lớn hoặc ô quá dài sẽ được báo để người dùng chọn ít mục hơn hoặc dùng Excel.

## Xử lý lỗi thường gặp

- **Chưa cấu hình:** kiểm tra `GOOGLE_CLIENT_ID` đúng môi trường Vercel và đã redeploy.
- **origin_mismatch:** thêm đúng origin của website đang mở (giao thức + tên miền + cổng nếu có), không thêm đường dẫn phía sau.
- **access_denied:** người dùng đóng cửa sổ/từ chối quyền hoặc chưa thuộc Test users khi ứng dụng còn Testing.
- **403 khi tạo bảng tính:** kiểm tra Sheets API đã bật trong project chứa Client ID và tài khoản đã cấp quyền tạo tệp.
- **Popup bị chặn:** cho phép mở cửa sổ đăng nhập Google trên website rồi thử lại.
- **Mất kết nối khi tạo:** kiểm tra Google Drive trước khi xuất lại, vì tệp có thể đã được tạo nhưng trình duyệt chưa nhận được kết quả.

Kiểm thử tự động dùng Google giả lập; cần thực hiện bước 8–9 bằng tài khoản thật sau khi cấu hình để xác nhận kết nối thực tế.

Tài liệu chính thức: [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [quyền Google Sheets](https://developers.google.com/workspace/sheets/api/scopes), [tạo bảng tính](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/create).
