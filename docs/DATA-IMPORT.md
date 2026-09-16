# Nhập data từ Excel

Quản trị viên vào **Quản lý data → Nhập Excel .xlsx → Tải file mẫu .xlsx**.
Điền trang đầu tiên, giữ hàng đầu làm tiêu đề:

| Cột | Nội dung |
| --- | --- |
| Tên | Bắt buộc, tối đa 200 ký tự |
| Số điện thoại | Bắt buộc, định dạng Văn bản để giữ số 0 đầu; nhận +84/0084 và chuẩn hóa về 0 |
| Nghề nghiệp | Bắt buộc, tối đa 200 ký tự; cũng nhận tiêu đề Nghề nghiệp hiện tại |
| Người mời | Khánh hoặc Tế |
| Dự án tham gia | Không bắt buộc; tên dự án, tối đa 200 ký tự |

Mỗi dòng là một hồ sơ. Tối đa 1.000 dòng dữ liệu, file 2 MB. Không dùng công thức. Cột có thể đổi vị trí. Dự án có tên tương ứng được liên kết vào lịch sử; tên dự án chưa tồn tại được lưu như lịch sử cũ, không tạo dự án mới. Nếu nhiều dự án trùng tên, dòng đó báo lỗi để tránh liên kết sai.

Chọn file rồi **Kiểm tra và xem trước**, sau đó **Nhập N hồ sơ hợp lệ**. Màn hình ghi rõ dòng lỗi và dòng trùng. Số điện thoại đã có hoặc lặp lại trong file bị bỏ qua toàn bộ dòng; không ghi đè hay thêm dự án cho hồ sơ cũ. Có thể sửa dòng lỗi rồi nhập lại cùng file mà không thêm trùng hồ sơ.

Dữ liệu được kiểm tra lại trên máy chủ khi lưu, kể cả khi có người khác vừa nhập cùng số điện thoại. Lỗi cơ sở dữ liệu sẽ hoàn tác toàn bộ lần nhập. Nhập Excel không tạo phản hồi khảo sát, không tăng chỉ tiêu khảo sát và không tự duyệt người tham gia hay đưa vào danh sách Giao mẫu. Hồ sơ không có dự án vẫn tìm kiếm và lọc người mời được.
