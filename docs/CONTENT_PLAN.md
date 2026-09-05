# Kế hoạch nội dung và Google API key cá nhân

## Luồng MVP

- Creator DNA → chốt Định hướng → mở Kế hoạch nội dung.
- Chọn ngày bắt đầu và ưu tiên tuần. Gemini tạo 7 nội dung cho 7 ngày liên tiếp, mỗi ngày một bài.
- Ma trận hiển thị trụ cột × mục đích (Giá trị, Kết nối, Chuyển đổi), tỷ lệ mục tiêu và số bài thực tế.
- Chỉnh nền tảng, định dạng, góc khai thác, hook, CTA, ghi chú sản xuất; tạo lại riêng một ngày hoặc toàn bộ tuần.
- Lưu nháp/chốt tạo phiên bản mới. Các phiên bản được phân theo ngày bắt đầu, lưu kèm bản định hướng đã chốt và snapshot DNA. Bản nháp định hướng mới không tự thay thế định hướng của kế hoạch cũ.
- Khi sang tab khác, bản chỉnh sửa được giữ. Khi quay lại từ Cài đặt, trạng thái kết nối AI được cập nhật mà không làm mất bản đang sửa.
- Đây là kế hoạch biên tập; chưa tự đăng bài, chưa lấy trend hoặc xây pipeline kịch bản.

## API

- `GET /api/content-plan?weekStart=YYYY-MM-DD`: phiên bản của kỳ 7 ngày, định hướng đã chốt gần nhất, trạng thái kết nối.
- `POST /api/content-plan/generate`: `{ baseVersion, directionId, brief: { weekStart, focus }, dayIndex?, items? }`.
- `POST /api/content-plan/versions`: `{ baseVersion, directionId, brief, items, status }`.
- `GET /api/settings/ai-key`: chỉ trạng thái, nguồn personal/workspace/none, model và bốn ký tự cuối.
- `PUT /api/settings/ai-key`: `{ apiKey }`; gửi một yêu cầu kiểm tra ngắn tới Gemini trước khi lưu. Không ghi đè key cũ nếu kiểm tra thất bại.
- `DELETE /api/settings/ai-key`: gỡ key trong emsen. Không thu hồi key bên Google; quay về kết nối workspace nếu có.

Mọi endpoint đều xác thực session và dùng user ID từ session. Các bản kế hoạch chỉ tham chiếu định hướng đã chốt thuộc cùng người dùng. `baseVersion` cũ trả 409; khóa theo user khi cấp phiên bản chống ghi đè đồng thời. Kết quả AI phải qua kiểm tra đủ 7 ngày không trùng, trụ cột hợp lệ và các trường bắt buộc trước khi lưu.

## Bảo vệ key

- Migration 5 thêm `user_ai_keys` và `content_plan_versions`.
- Key mã hóa AES-256-GCM với IV ngẫu nhiên và user ID làm authenticated associated data; ciphertext không thể chuyển sang tài khoản khác để giải mã.
- Production phải đặt `AI_KEY_ENCRYPTION_KEY` là 32 byte ngẫu nhiên dạng base64, quản lý ngoài database và source control. Không thay key này tùy tiện: key cũ cần để giải mã dữ liệu đã lưu; đổi key phải có bước re-encrypt.
- Local development tự sinh secret ở `.local/ai-key-encryption.key` (đã gitignore). Giữ và sao lưu riêng file này khi cần giữ API key cá nhân sau khi phục hồi database. Không dùng file local làm cách triển khai production nhiều instance.
- Key cá nhân ưu tiên cho chat, đánh giá Creator DNA, định hướng, kế hoạch. Khi có key cá nhân nhưng lỗi, không âm thầm gọi key workspace. Chat/đánh giá có thể trả fallback theo luồng hiện có.
- Không lưu key trong localStorage/sessionStorage, không trả key nguyên văn cho frontend, không ghi lỗi provider/raw request body vào log. Cấu hình AI key có `Cache-Control: no-store`.
- Triển khai production cần HTTPS. Cơ chế chặn yêu cầu tạo/kiểm tra trùng hiện ở từng tiến trình; nhiều instance cần giới hạn tập trung như Redis.

## Hướng dẫn Google

Hướng dẫn trong Cài đặt được đối chiếu ngày 05/09/2026:

- [Tạo và quản lý Gemini API key](https://ai.google.dev/gemini-api/docs/api-key)
- [Google AI Studio — API keys](https://aistudio.google.com/api-keys)
- [Hạn mức và thanh toán](https://ai.google.dev/gemini-api/docs/billing)

Không cam kết mọi model luôn miễn phí. Người dùng cần kiểm tra hạn mức/billing của project trên Google.

## Kiểm thử

`npm run test:content-plan --workspace @creator-flow/api` kiểm tra date/schema, đăng nhập, key mã hóa/cách ly/thay thế/gỡ, gọi đúng key, định hướng thuộc tài khoản, tạo lại riêng ngày, lỗi AI không mất dữ liệu, lưu/chốt/lịch sử và xung đột ghi.

Test dùng PostgreSQL local, tạo user UUID tạm và dọn đúng các fixture này; Gemini được mô phỏng, không tiêu hạn mức Google. Chạy thêm `npm run test:direction --workspace @creator-flow/api` để kiểm tra hồi quy sau đổi cách chọn provider.
