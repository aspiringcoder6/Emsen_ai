# Storyboard và thời gian đọc

Storyboard là bản hướng dẫn quay: mỗi ô thể hiện một shot, một hành động chính,
cỡ cảnh, góc máy, chuyển động, cách thực hiện, chuẩn bị và điểm nối sang cảnh sau.
Lời thoại hiện đầy đủ dưới khung, có thời gian trên timeline và thời gian đọc
ước tính riêng. Chọn một cảnh rồi mở tab Quay để chỉnh hướng dẫn.

## Lời thoại

- Tiếng Việt được đếm theo tiếng tách bằng dấu cách, không gọi nhầm là số từ
  tiếng Anh. Timestamp, nhãn thể hiện và ghi chú trong ngoặc vuông không được đếm.
- Mốc khởi đầu dùng để lập kế hoạch: chậm 3,7, cân bằng 4,5, nhanh 5,2 tiếng/giây.
  Khoảng gợi ý dao động ±12%; đây là heuristic, chưa phải tốc độ được đo từ giọng
  của từng creator. Ngôn ngữ khác dùng số từ với mốc 2 / 2,5 / 3 từ/giây.
- Với nhịp cân bằng, cảnh thoại 10 giây được gợi ý khoảng 40–50 tiếng; video
  60 giây khoảng 238–302 tiếng. Ví dụ, 18 tiếng được ước tính khoảng 3–5 giây,
  sẽ bị cảnh báo nếu gán 10 giây.
- Khi tạo mới, API kiểm tra ngân sách toàn bài và độ dài từng đoạn. AI được thử
  sửa một lần; đoạn vẫn quá ngắn hoặc dài sẽ không được trả về như bản hợp lệ.
  Sửa định dạng timestamp không thay thế việc phát triển đủ lời thoại.
- Khi AI viết lại một phần, giữ ranh giới thời gian của phần đó; không rút
  timeline để che việc thiếu lời thoại. Những phần khác không bị sửa.
- Khi chia storyboard, đối chiếu toàn bộ thoại theo thứ tự Hook → Nội dung → CTA,
  kiểm tra tổng thời lượng sau khi giữ cảnh khóa/ảnh/chữ, và kiểm tra từng cảnh.
  Cảnh không thoại được phép nhưng phải có hành động và chỉ dẫn; phần hình không
  thoại nên là shot riêng. Bản đề xuất lỗi được thử sửa một lần.

Creator vẫn cần đọc thử bằng đồng hồ trước khi quay. Con số, từ viết tắt,
ngoại ngữ và khoảng nghỉ khi diễn xuất có thể khiến thời gian thực tế khác ước tính.
Không ghi rằng đã đo thời lượng audio khi chưa có audio.

## Ảnh tham chiếu

Phác thảo đen trắng là mặc định, ảnh màu vẫn có thể chọn. Mỗi lượt tạo ảnh chỉ
yêu cầu một shot, một hành động, ưu tiên cỡ cảnh/góc máy đã chọn và không vẽ chữ,
số cảnh hay bảng nhiều ô trong ảnh. Model text chuẩn bị một brief tiếng Anh ngắn
trong cùng lượt chia cảnh để model ảnh nhẹ dễ hiểu hơn; không cần thêm dịch vụ.
Khi creator đổi mô tả hoặc bố cục bằng tay, brief dịch cũ bị vô hiệu để không tạo
ảnh theo cảnh trước. Ảnh cũ được đánh dấu khi thông tin nguồn đã thay đổi.

Sơ đồ bố cục bằng vector có sẵn ngay khi chưa có ảnh, không dùng lượt tạo ảnh.
Đó là sơ đồ trung tính, không phải bản vẽ chính xác của người/sản phẩm thực tế.
Model ảnh free vẫn có thể sai hình người, đạo cụ hoặc phối cảnh; chọn phương án
khác hoặc tải ảnh tham chiếu sẵn có. Không tự tạo lại nhiều lần để tránh tốn quota.

Các trường hướng dẫn mới là optional với tài liệu cũ; lưu bằng JSON hiện có,
không cần migration database. Khóa cảnh tiếp tục giữ nguyên toàn bộ cảnh; ảnh
và chữ đã chọn được bảo toàn khi AI đề xuất lại.
