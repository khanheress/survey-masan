# Nhập data từ Excel

Quản trị viên vào **Quản lý data → Nhập Excel .xlsx → Tải file mẫu .xlsx**.
Điền trang đầu tiên, giữ hàng đầu làm tiêu đề:

| Cột | Nội dung |
| --- | --- |
| Tên | Bắt buộc, tối đa 200 ký tự |
| Năm sinh | Không bắt buộc, số nguyên từ 1900 đến năm hiện tại |
| Số điện thoại | Bắt buộc, định dạng Văn bản để giữ số 0 đầu; nhận +84/0084 và chuẩn hóa về 0 |
| Địa chỉ | Không bắt buộc, tối đa 1.000 ký tự |
| Nghề nghiệp | Bắt buộc, tối đa 200 ký tự; cũng nhận tiêu đề Nghề nghiệp hiện tại |
| Tình trạng hôn nhân | Không bắt buộc: Độc thân, Đã kết hôn - chưa con, Đã kết hôn - có con |
| Dự án tham gia | Không bắt buộc; tên dự án, tối đa 200 ký tự |
| Người mời | Khánh hoặc Tế |

File cũ không có ba cột bổ sung vẫn nhập được. Các giá trị bổ sung được lưu vào hồ sơ và hiển thị trong màn hình xem trước.

Mỗi dòng là một hồ sơ. Tối đa 1.000 dòng dữ liệu, file 2 MB. Không dùng công thức. Cột có thể đổi vị trí. Dự án có tên tương ứng được liên kết vào lịch sử; tên dự án chưa tồn tại được lưu như lịch sử cũ, không tạo dự án mới. Nếu nhiều dự án trùng tên, dòng đó báo lỗi để tránh liên kết sai.

Chọn file rồi **Kiểm tra và xem trước**, sau đó **Nhập N hồ sơ hợp lệ**. Màn hình ghi rõ dòng lỗi và dòng trùng. Số điện thoại đã có hoặc lặp lại trong file bị bỏ qua toàn bộ dòng; không ghi đè hay thêm dự án cho hồ sơ cũ. Có thể sửa dòng lỗi rồi nhập lại cùng file mà không thêm trùng hồ sơ.

Dữ liệu được kiểm tra lại trên máy chủ khi lưu, kể cả khi có người khác vừa nhập cùng số điện thoại. Lỗi cơ sở dữ liệu sẽ hoàn tác toàn bộ lần nhập. Nhập Excel không tạo phản hồi khảo sát, không tăng chỉ tiêu khảo sát và không tự duyệt người tham gia hay đưa vào danh sách Giao mẫu. Hồ sơ không có dự án vẫn tìm kiếm và lọc người mời được.

## Nhập trực tiếp vào một dự án

Mở dự án → **Người tham gia (Excel) → Nhập người tham gia từ Excel**. Dùng cùng file mẫu theo thứ tự Tên, Năm sinh, Số điện thoại, Địa chỉ, Nghề nghiệp, Tình trạng hôn nhân, Dự án tham gia, Người mời. Tên, Số điện thoại, Nghề nghiệp và Người mời bắt buộc. Cột Dự án tham gia có thể bỏ trống: đích nhập luôn là dự án đang mở, bất kể nội dung cột này.

Kiểm tra xem trước rồi nhập các dòng hợp lệ. Người mới được tạo hồ sơ trong Quản lý data; người đã có được dùng lại hồ sơ hiện tại (không ghi đè thông tin). Hồ sơ đã có phản hồi hoặc đã được nhập vào dự án sẽ bị bỏ qua, giữ trạng thái duyệt hiện có. Nhập lại cùng file không thêm trùng.

Người nhập thành công được **cho tham gia ngay** và xuất hiện trong **Giao mẫu**. Có thể đổi sang Chờ duyệt hoặc Không cho tham gia ở bảng Người tham gia (Excel). Quản trị viên có thể chỉnh sửa thông tin trong Quản lý data; thay đổi được hiển thị lại ở dự án và Giao mẫu.

Đây là danh sách được quản trị viên duyệt trực tiếp, không qua điều kiện tuổi/BUMO hoặc chỉ tiêu của luồng điền khảo sát. Không tạo câu trả lời hay tăng số phản hồi khảo sát. Khi xóa dự án, danh sách trực tiếp và trạng thái giao mẫu bị xóa cùng dự án; hồ sơ và lịch sử trong Quản lý data được giữ lại.
