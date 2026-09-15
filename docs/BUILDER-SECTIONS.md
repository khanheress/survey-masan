# Trình tạo khảo sát theo phần

Bên trái là danh sách **Các phần**, tên phần và số câu hỏi. Chọn một phần để sửa nội dung bên phải. Bấm tiêu đề một thẻ câu hỏi để mở phần chỉnh sửa.

- Nút lên/xuống sắp xếp phần hoặc câu hỏi. Sắp xếp phần di chuyển cả các câu hỏi bên trong.
- Nút sao chép tạo mã mới và cập nhật các tham chiếu nội bộ khi sao chép cả phần.
- **Chuyển sang…** đưa câu hỏi sang phần khác.
- Nút xóa có xác nhận. Nếu mục đang được tham chiếu bởi điều kiện/logic/câu khác, cần sửa tham chiếu trước.
- **Sau phần này** chọn phần tiếp theo hoặc hoàn tất. Điểm đến chỉ nằm phía sau để tránh vòng lặp.

## Điều kiện hiển thị

Trong phần đang chọn, thêm nhóm điều kiện **HOẶC**. Trong một nhóm, các điều kiện kết hợp bằng **VÀ**. Điều kiện chỉ dùng câu hỏi trước phần hiện tại. Không có điều kiện nghĩa là luôn hiển thị.

Ví dụ: phần Nước tăng lực chỉ xuất hiện nếu câu hỏi nhãn hiệu **Có chọn → Sting**. Thêm nhóm HOẶC thứ hai **Có chọn → Red Bull** để hỏi người chọn một trong hai nhãn hiệu.

Điều kiện hiển thị được xét trước quy tắc chuyển câu hỏi. Phần không đủ điều kiện bị bỏ qua cùng các câu hỏi và quy tắc bên trong. Câu hỏi bị bỏ qua không bắt buộc và dữ liệu của nhánh cũ không được gửi.

## Các loại câu hỏi mới

- **Lưới một lựa chọn**: mỗi hàng chọn một cột. Khi bắt buộc, mọi hàng phải trả lời.
- **Lưới nhiều lựa chọn**: mỗi hàng chọn nhiều cột; mọi hàng phải có ít nhất một lựa chọn nếu bắt buộc.
- **Phân bổ số lần**: nhập danh sách và tổng số lần. Câu trả lời phải là số nguyên không âm, tổng đúng số đã đặt.
- **Ghi chi tiết theo đáp án đã chọn**: chọn câu hỏi nguồn phía trước; chỉ hiện ô chi tiết cho các đáp án đã chọn.
- **Tải tệp / Chụp ảnh**: PNG, JPG, WebP hoặc PDF; mỗi tệp tối đa 512 KB, tổng 1 MB mỗi phiếu. Ảnh lớn được thu nhỏ tự động; nếu vẫn quá lớn phải chọn ảnh nhỏ hơn. Nút chụp ảnh dùng camera khi trình duyệt/thiết bị hỗ trợ.
- **Đánh giá bằng biểu tượng**: ngôi sao, trái tim hoặc mặt cười, có thể chọn thang điểm.

Tệp được lưu cùng phản hồi trong cơ sở dữ liệu, không cần cấu hình dịch vụ lưu trữ riêng. Người quản lý đăng nhập tải tệp trong chi tiết phản hồi. CSV chỉ chứa tên tệp; câu trả lời dạng lưới/phân bổ được chuyển thành văn bản dễ đọc. Xóa phản hồi sẽ xóa luôn tệp đính kèm trong phản hồi đó.

## Chèn câu trả lời trước

Mở thẻ câu hỏi, chọn **Chèn câu trả lời trước**. Nội dung có dạng `{{q:mã_câu_hỏi}}` trong trình tạo và được thay bằng câu trả lời thực tế khi người tham gia điền. Nội dung được hiển thị như văn bản, không chạy HTML.

## Kiểm tra và lưu

**Xem trước** cho thử điều kiện, rẽ nhánh và các câu hỏi mới mà không lưu phản hồi. **Làm lại bản xem trước** bắt đầu lại. **Lưu** ghi bản chỉnh sửa; **Công khai** lưu trước khi phát hành. Khảo sát cũ vẫn mở được và các câu hỏi ban đầu được đặt vào phần Câu hỏi chung khi sửa.
