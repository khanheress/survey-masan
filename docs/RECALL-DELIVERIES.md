# Form Recall theo dự án và Giao mẫu

## Form Recall

- Trong chi tiết dự án, mở **Form Recall của dự án** để tạo form riêng, quản lý các khung giờ và xem đăng ký.
- Có thể đi từ menu **Form Recall** → chọn dự án. Mỗi dự án có thể có nhiều form với link, lịch hẹn và quy tắc trùng giờ riêng.
- Form mới bắt buộc thuộc một dự án đang tồn tại. Form đã gắn dự án không chuyển sang dự án khác để tránh trộn đăng ký.
- Form cũ nằm trong **Form cũ chưa gắn dự án**. Chọn **Chỉnh sửa → Gắn vào dự án**; link và các lượt đăng ký được giữ nguyên.
- Việc gắn dự án không tự giới hạn đăng ký Recall theo trạng thái duyệt phản hồi. Các quy tắc ngày giờ và trùng lịch hiện tại vẫn được áp dụng.

## Giao mẫu

Mở **Giao mẫu** ở menu, chọn dự án. Danh sách gồm người có ít nhất một phản hồi được duyệt **Cho tham gia** trong dự án đó. Mỗi hồ sơ được hiển thị một lần dù có nhiều phản hồi được duyệt.

Mỗi dòng gồm tên, số điện thoại, địa chỉ, ô **Đã giao / Chưa giao**, và ghi chú:

- Tick/bỏ tick để lưu trạng thái ngay.
- Nhập ghi chú rồi nhấn **Lưu ghi chú** (tối đa 2.000 ký tự).
- Trạng thái và ghi chú riêng cho từng dự án, không bị dùng chung giữa các dự án của cùng người.
- Tên, số điện thoại và địa chỉ dùng thông tin hiện tại trong Quản lý data. Chỉnh sửa số điện thoại giữ lại trạng thái và ghi chú giao mẫu.
- Nếu không còn phản hồi nào được duyệt, người đó rời danh sách giao mẫu. Thông tin giao đã lưu vẫn được giữ để dùng lại nếu được duyệt lại.
- Người dùng đã đăng nhập quản trị có thể xem và cập nhật giao mẫu. Khách mở link khảo sát không truy cập được danh sách này.

Xóa dự án sẽ xóa các Form Recall, lượt đăng ký, khung giờ và bản ghi giao mẫu của dự án đó. Hồ sơ và lịch sử khảo sát trong Quản lý data vẫn được giữ.

Các bảng/cột mới được tạo tự động khi ứng dụng kết nối database sau triển khai; không cần chạy SQL thủ công.
