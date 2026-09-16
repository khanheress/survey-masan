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

## Tạo nhanh lịch Recall

Form mới mặc định dùng **Tạo nhanh theo ngày và khoảng giờ**:

1. Chọn tháng, bấm các ngày cần nhận đăng ký (có thể chọn nhiều ngày ở nhiều tháng).
2. Nhập giờ bắt đầu, giờ kết thúc và khoảng cách giữa các mốc giờ, tính bằng phút.
3. Thêm các khoảng nghỉ trưa, nghỉ tối hoặc thời gian không nhận đăng ký. Các khoảng nghỉ áp dụng cho tất cả ngày đã chọn.
4. Kiểm tra phần **Xem trước** rồi lưu form. Lịch được tạo tự động khi lưu, không cần nhập từng dòng.

Các mốc tính đều từ giờ bắt đầu; không bắt đầu lại nhịp sau khoảng nghỉ. Bỏ các mốc từ đầu giờ nghỉ đến trước cuối giờ nghỉ. Mốc tại giờ kết thúc được nhận nếu khớp nhịp. Đây là giờ đăng ký, không phải thời lượng cuộc hẹn.

Ví dụ ngày 15, 16, 17; từ 09:40 đến 20:00; cách 20 phút; nghỉ 12:10–12:59 và 18:00–19:00: mỗi ngày có 27 mốc, tổng 81 mốc. Không có 12:20, 12:40, 18:00, 18:20, 18:40; có 13:00 và 19:00.

Thiết lập tạo nhanh được lưu để tiếp tục chỉnh sửa. Khi tạo lại lịch, các giờ đã có người đăng ký được giữ nguyên dù nằm ngoài lịch mới, và phần xem trước báo số giờ được giữ thêm. Form cũ vẫn có chế độ **Nhập từng khung giờ**; có thể chuyển giữa hai cách tạo lịch. Tối đa 500 khung giờ mỗi form.
