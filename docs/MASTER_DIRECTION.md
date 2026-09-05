# Định hướng kênh — Master Direction

Theo MVPPlan.md: định vị, tone, audience và content pillars. Giao diện và kết quả AI bằng tiếng Việt.

## Luồng sử dụng

1. Mở Định hướng sau Creator DNA. Điền mục tiêu kênh và ghi chú tùy chọn.
2. Chọn “Đề xuất từ Creator DNA” hoặc tự viết nội dung. AI cần ít nhất chủ đề trong DNA, không bắt buộc hoàn tất onboarding.
3. Chỉnh định vị, giọng điệu, khán giả và 3–5 trụ cột. Mỗi trụ cột có mô tả, tỷ lệ và 1–3 ý tưởng. Tổng tỷ lệ phải bằng 100%.
4. Có thể tạo lại toàn bộ hoặc riêng từng phần. Những phần khác, kể cả chỉnh sửa đang làm, được giữ khi tạo lại riêng.
5. Lưu nháp hoặc chốt. Mỗi thao tác tạo một phiên bản mới; bản cũ không bị ghi đè. Có thể mở bản cũ và lưu thành bản mới.

Định hướng đang chỉnh được giữ khi chuyển tab trong workspace. Khi tải lại/đóng trang, trình duyệt cảnh báo nếu còn thay đổi chưa lưu. Dữ liệu đã lưu được tải từ server khi đăng nhập lại.

## API và lưu trữ

- `GET /api/direction`: Creator DNA hiện tại, trạng thái cấu hình AI và lịch sử mới nhất trước.
- `POST /api/direction/generate`: `{ baseVersion, brief: { goal, notes }, section, content? }`; section là all/positioning/tone/audience/pillars. Khi tạo lại riêng, content phải là bản đầy đủ hợp lệ.
- `POST /api/direction/versions`: `{ baseVersion, brief, content, status }`; status là draft/approved.
- Tất cả endpoint dùng cookie session. `user_id` chỉ lấy từ session.
- Migration 4 tạo `direction_versions`. Phiên bản chứa dữ liệu JSON có cấu trúc, snapshot Creator DNA, nguồn, model và thời điểm lưu.
- Khóa theo người dùng khi cấp phiên bản; `baseVersion` cũ trả 409. AI gọi ngoài transaction; kiểm tra lại phiên bản ngay trước lưu.
- AI dùng adapter Gemini hiện có; đầu vào gồm profile, tối đa 40 tín hiệu mới nhất, brief và bản đang chỉnh. Khóa API luôn ở backend. Kiểm tra schema đầu ra trước khi lưu; lỗi provider/JSON trả 502 và không ghi đè nội dung hiện tại.
- Bản được chốt gần nhất là `versions.find(version => version.status === "approved")`. Bước Content Plan sau này cần lưu ID phiên bản này vào đầu vào của kế hoạch, để một bản nháp mới không tự thay đổi kế hoạch cũ.

## Kiểm tra

`npm run test:direction --workspace @creator-flow/api` dùng PostgreSQL local được cấu hình, tự chạy migration và tạo hai user kiểm thử với UUID ngẫu nhiên, dọn đúng các user này khi kết thúc. Gemini được thay bằng kết quả kiểm thử, không gọi dịch vụ bên ngoài. Kiểm tra validation, session, lưu/chốt/lịch sử, cách ly tài khoản, tạo lại riêng, lỗi AI và xung đột ghi đồng thời.

## Giới hạn của bước này

Chưa triển khai Content Plan, phân tích thị trường tự động hay duyệt bởi admin. “Chốt” là quyết định của chủ tài khoản. UI giữ tất cả phiên bản trong một danh sách; có thể thêm phân trang khi lịch sử lớn. Chặn gọi AI đồng thời hiện ở từng tiến trình API; triển khai nhiều instance cần chuyển giới hạn này sang Redis.
