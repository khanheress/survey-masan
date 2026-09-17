# Tối ưu tải dữ liệu

- Quản lý data: gom lịch sử theo trang, từ 23 truy vấn xuống 4 cho trang 20 hồ sơ. Xuất CSV chia nhóm 500 hồ sơ để không vượt số tham số SQL.
- Tổng quan: lấy dữ liệu tính chỉ tiêu của tất cả dự án đang chạy bằng một truy vấn thay vì một truy vấn mỗi dự án. Giữ nguyên cách tính giới tính, tuổi, BUMO và múi giờ Việt Nam.
- Danh sách dự án Giao mẫu: 4 truy vấn cố định; chỉ lấy khóa để đếm người được duyệt và đã giao, không tải toàn bộ thông tin cá nhân và ghi chú của từng dự án. Không đếm trùng người vừa có phản hồi vừa được nhập Excel.
- Thêm chỉ mục cho phản hồi theo dự án, khảo sát/số điện thoại, ngày gửi, trạng thái duyệt, người mời và tháng theo giờ Việt Nam; thêm chỉ mục cho lịch sử còn hiển thị.
- Các bảng nhập Excel, chỉnh sửa hồ sơ, danh sách dự án của hồ sơ, Recall và mẫu tóm tắt được tải khi mở.

Không dùng bộ nhớ đệm chung cho dữ liệu cá nhân, không đổi logic cấp quyền, sàng lọc hoặc giao dịch ghi dữ liệu. Chỉ mục tự tạo khi ứng dụng kết nối database; lần khởi tạo đầu sau triển khai có thể lâu hơn để xây chỉ mục.

Kiểm thử kiểm tra số truy vấn, kế hoạch truy vấn có dùng chỉ mục, kết quả chỉ tiêu và giao mẫu. Số truy vấn là đo trên dữ liệu thử, không phải thời gian phản hồi đo trên Vercel/Turso thật. Độ trễ thực tế vẫn phụ thuộc kết nối và vị trí hosting/database.
