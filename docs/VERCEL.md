# Khắc phục đăng nhập trên Vercel

Bản cũ dùng file SQLite `data/survey.db` trên máy chạy ứng dụng. File đó không phải cơ sở dữ liệu dùng chung, lưu lâu dài trên Vercel. Mật khẩu đã đổi trên máy cá nhân cũng không tự cập nhật tài khoản trên hosting. Ngoài ra, bản cũ hiển thị lỗi máy chủ thành thông báo sai mật khẩu.

Bản sửa sử dụng Turso **libSQL** qua HTTP khi có cấu hình, và tiếp tục hỗ trợ file SQLite khi chạy trên máy cá nhân. Toàn bộ khảo sát, phản hồi, Quản lý data và Form Recall dùng chung kết nối này.

## Thiết lập cho survey-masan.vercel.app

1. Tạo một database **libSQL** trên Turso, hoặc kết nối Turso từ Vercel → Storage. Lấy Database URL và Database Auth Token có quyền đọc/ghi. Bản mã này dùng `@libsql/client`, vì vậy chọn engine libSQL, không chọn engine Turso mới nếu giao diện có cả hai.
2. Trong dự án Vercel, vào **Settings → Environment Variables**, thêm các biến cho môi trường **Production**:

| Tên biến | Giá trị |
| --- | --- |
| `TURSO_DATABASE_URL` | Database URL lấy từ Turso, thường bắt đầu bằng `libsql://` |
| `TURSO_AUTH_TOKEN` | Database Auth Token đọc/ghi từ Turso |
| `NEXTAUTH_URL` | `https://survey-masan.vercel.app` |
| `NEXTAUTH_SECRET` | Chuỗi ngẫu nhiên được tạo một lần; giữ nguyên qua các lần triển khai |
| `BOOTSTRAP_ADMIN_PASSWORD` | `admin1234` nếu muốn dùng mật khẩu đã yêu cầu |

Có thể tạo `NEXTAUTH_SECRET` bằng `openssl rand -base64 32`. Nhập giá trị trực tiếp vào Vercel; không đưa các khóa bí mật vào Git hoặc tin nhắn.

3. Đưa bản mã đã sửa lên repository kết nối với Vercel, rồi triển khai lại (**Redeploy**) sau khi đã đặt đủ biến.
4. Mở `/login`, đăng nhập `admin` với mật khẩu đã đặt trong `BOOTSTRAP_ADMIN_PASSWORD`.

Các bảng được tạo tự động ở lần kết nối đầu tiên. Tài khoản `admin` chỉ được tạo khi database chưa có người dùng. Thay đổi biến mật khẩu rồi redeploy **không** đặt lại mật khẩu của tài khoản đã tồn tại.

Dữ liệu cũ trên máy chưa tự chuyển sang database mới. Nếu cần giữ dữ liệu đó, nhập bản sao SQLite vào một database libSQL mới trước khi mở website; dùng mật khẩu của tài khoản trong dữ liệu đã nhập. Không lấy file `.db` đang được ghi mà bỏ sót WAL: tạo bản sao nhất quán trước khi nhập. Tham khảo hướng dẫn di chuyển của Turso.

## Kiểm tra kết quả

- Sai mật khẩu thật sự: trang báo “Tên đăng nhập hoặc mật khẩu không đúng”.
- Thiếu/sai database: trang báo không kết nối được dữ liệu tài khoản.
- Thiếu cấu hình phiên đăng nhập: kiểm tra `NEXTAUTH_SECRET` và `NEXTAUTH_URL`.
- Sau khi đăng nhập, tạo thử dự án và một đăng ký Recall để xác nhận việc lưu dữ liệu.

## Tài liệu chính thức

- https://vercel.com/kb/guide/is-sqlite-supported-in-vercel
- https://docs.turso.tech/integrations/vercel
- https://docs.turso.tech/cloud/migrate-to-turso
- https://next-auth.js.org/configuration/options
