# Kiến trúc MVP hiện tại

## Luồng tổng quát dự kiến

```text
Web -> API -> PostgreSQL
          -> Google Gemini API
          -> MinIO
          -> Redis/BullMQ -> Worker -> FFmpeg / AI local (dự kiến)
```

## Phần đã triển khai

- `web` có giao diện đăng ký/đăng nhập, dashboard, onboarding CreatorDNA và vòng
  lặp tích lũy. Web gọi API với cookie session và không giữ dữ liệu tài khoản
  trong `localStorage`.
- `api` có module auth, session, CreatorDNA và đánh giá người dùng. Các mutation
  kiểm tra origin, payload có giới hạn kích thước và auth có rate limit cơ bản.
- `contracts` chứa DTO dùng chung để frontend/backend không lệch schema.
- `ai-provider` định nghĩa adapter độc lập với nghiệp vụ và có implementation
  Google Gemini qua REST. API key chỉ tồn tại ở server.
- PostgreSQL có migration tự chạy cho user, session, profile CreatorDNA, tín
  hiệu tích lũy và lịch sử từng lần đánh giá AI.
- `worker` vẫn là placeholder cho queue, transcription và render ở milestone
  sau.
- Master Direction đã có giao diện Định hướng, API sinh/chỉnh/chốt và lịch sử
  phiên bản theo tài khoản. Mỗi phiên bản lưu snapshot Creator DNA; AI dùng
  Gemini adapter hiện có, kiểm tra JSON và tỷ lệ trụ cột trước khi lưu.
  Xem [MASTER_DIRECTION.md](./MASTER_DIRECTION.md) cho luồng và API.
- Content Plan đã có ma trận nội dung và kế hoạch 7 ngày từ định hướng đã chốt,
  tạo lại từng ngày, chỉnh sửa và lịch sử phiên bản. Cài đặt hỗ trợ API key
  Google cá nhân, mã hóa ở backend và dùng chung cơ chế chọn provider cho mọi
  tính năng AI. Xem [CONTENT_PLAN.md](./CONTENT_PLAN.md).

## Luồng authentication

```text
Đăng ký/đăng nhập -> API xác thực -> session token ngẫu nhiên trong cookie HttpOnly
                                  -> chỉ hash token được lưu trong PostgreSQL
Tải lại trang     -> GET /api/auth/me -> khôi phục người dùng từ session
Đăng xuất         -> thu hồi session ở database và xóa cookie
```

Mật khẩu được băm bằng `scrypt` cùng salt riêng. Email được chuẩn hóa và có ràng
buộc unique ở database.

## Luồng đánh giá CreatorDNA

```text
Đăng ký -> đánh giá khởi đầu từ tên hiển thị + lựa chọn onboarding
6 câu hỏi -> lưu tiến độ từng bước -> hoàn thành -> đánh giá CreatorDNA đầy đủ
                                              -> lưu input snapshot + output
```

Gemini được yêu cầu trả JSON theo schema. Nếu chưa cấu hình key, timeout hoặc
provider trả dữ liệu không hợp lệ, API sinh kết quả fallback và vẫn ghi lịch sử
để flow không bị gián đoạn. Email và mật khẩu không được đưa vào prompt.

## Phần được trì hoãn có chủ đích

- ORM đầy đủ; migration hiện dùng SQL nhỏ gọn chạy trực tiếp qua `pg`.
- AI cho vòng lặp tích lũy; hiện phần đề xuất tín hiệu vẫn là engine demo có thể
  thay bằng provider thật qua cùng ranh giới adapter.
- Công cụ speech-to-text.
- Chi tiết queue, retry và theo dõi chi phí.
- Preset ASS, pipeline FFmpeg và cấu hình encode.
- Phân quyền nhiều workspace, xác minh email, quên mật khẩu và OAuth.
