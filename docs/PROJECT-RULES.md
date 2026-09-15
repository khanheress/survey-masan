# Điều kiện dự án và báo cáo

## Thiết lập

Trong **Tạo dự án** hoặc **Chỉnh sửa dự án**, bật từng điều kiện cần dùng:

- **Giới tính:** chỉ tiêu Nam và Nữ riêng biệt.
- **Nhóm tuổi:** thêm các khoảng tuổi không giao nhau, ví dụ 18–25 và 26–30. Có thể đặt chỉ tiêu cho từng nhóm. Tuổi được tính bằng năm hiện tại theo giờ Việt Nam trừ năm sinh.
- **BUMO:** nhập một hoặc nhiều tên sản phẩm được nhận, trùng chính xác với đáp án khảo sát. Trong trình tạo câu hỏi, mở một câu một lựa chọn, nhiều lựa chọn hoặc danh sách thả xuống và đánh dấu **Dùng làm câu hỏi BUMO của dự án**. Mỗi khảo sát chọn một câu BUMO. Đặt câu này ở phần mà tất cả người tham gia đều được hỏi.

Để trống chỉ tiêu nghĩa là không giới hạn; 0 nghĩa là không nhận nhóm đó. Các điều kiện bật được xét đồng thời. Nếu chọn nhiều đáp án BUMO được nhận, từng sản phẩm đó đều phải còn chỉ tiêu và đều được cộng một phản hồi. Chỉ tiêu tính chung cho các khảo sát trong cùng dự án.

Khi không phù hợp hoặc nhóm đã đủ chỉ tiêu, form yêu cầu người điền liên hệ lại người mời. Trường hợp này không lưu phản hồi hợp lệ. Máy chủ kiểm tra lại điều kiện khi gửi, trong cùng giao dịch ghi phản hồi để tránh vượt chỉ tiêu do gửi đồng thời. Xóa phản hồi sẽ trả lại chỉ tiêu đã sử dụng.

Giới tính là mục bắt buộc của phản hồi mới. Phản hồi cũ không bị gán giới tính hay BUMO suy đoán. Tiến độ giới tính/BUMO chỉ tính dữ liệu có thông tin tương ứng. Tuổi của phản hồi mới được lưu tại thời điểm gửi; dữ liệu cũ dùng năm gửi và năm sinh nếu có.

## Xem và xuất dữ liệu

**Quản lý phản hồi** có bộ lọc Người mời và sắp xếp theo người mời A → Z/Z → A. CSV giữ bộ lọc đang chọn.

Chi tiết phản hồi hiển thị tên câu hỏi và nội dung câu trả lời. Phản hồi mới lưu tên câu hỏi, đã thay các tham chiếu bằng câu trả lời, tại thời điểm gửi. Phản hồi cũ lấy tên từ khảo sát hiện tại; nếu câu hỏi cũ đã bị xóa và chưa từng được lưu tên thì không thể khôi phục tên chỉ từ mã câu hỏi.

Trong chi tiết dự án, chọn **Xuất Excel (.xlsx)**, đánh dấu các mục cần xuất. Tệp chứa toàn bộ phản hồi của dự án, không giới hạn theo trang đang xem. Tệp đính kèm được ghi tên tệp, không nhúng dữ liệu tệp vào Excel.

**Tổng quan** hiển thị số phản hồi của từng người mời theo tháng (giờ Việt Nam), cùng tiến độ tổng và từng chỉ tiêu của các dự án đang hoạt động. Đây là số phản hồi đã lưu, không phải số người duy nhất; phản hồi bị xóa không còn được tính.

## Triển khai

Commit và push các thay đổi, bao gồm `package.json` và `package-lock.json`, để Vercel cài thư viện xuất Excel. Các cột dữ liệu mới được bổ sung tự động khi ứng dụng kết nối database; không cần chạy SQL thủ công. Cần giữ nguyên cấu hình Turso hiện có trên hosting.

## Duyệt tham gia và sửa hồ sơ

Trong **Quản lý phản hồi → Thao tác**, quản trị viên chọn **Chờ duyệt**, **Cho tham gia**, hoặc **Không cho tham gia**. Trạng thái có thể thay đổi lại; phản hồi không bị xóa và không chặn số điện thoại gửi vào các khảo sát khác. Có bộ lọc trạng thái, và cột trạng thái trong CSV/Excel/Google Sheets.

Trạng thái duyệt là quyết định tuyển người tham gia sau khi thu thập. Chỉ tiêu đầu vào và thống kê số phản hồi vẫn tính các phản hồi đã gửi, bao gồm phản hồi chờ duyệt hoặc không được chọn. Muốn bỏ hẳn phản hồi và trả lại chỉ tiêu thì dùng thao tác xóa phản hồi.

Trong **Quản lý data**, dùng **Chỉnh sửa** ở từng dòng hồ sơ. Thay đổi chỉ cập nhật hồ sơ quản lý, không thay các phản hồi lịch sử. Thông tin đã chỉnh sửa được ưu tiên giữ lại khi có lần gửi sau cùng số điện thoại. Đổi số điện thoại giữ nguyên lịch sử và bị từ chối nếu số mới đã thuộc hồ sơ khác.

Nút **Xóa dự án** có ở danh sách dự án và trang chi tiết dự án. Chỉ quản trị viên được xóa, và cần xác nhận trên giao diện; việc xóa giữ hồ sơ/lịch sử trong Quản lý data.

Cấu hình xuất Google Sheets: xem [GOOGLE-SHEETS.md](GOOGLE-SHEETS.md).
