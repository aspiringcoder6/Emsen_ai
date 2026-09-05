# emsen

MVP nội bộ emsen, dựa trên phạm vi trong `MVPPlan.md`, `docs/CREATORDNA.md`
và lịch triển khai trong `Timeline.csv`.

## Cấu trúc

```text
apps/
  web/        React + Tailwind, giao diện người dùng
  api/        Express, API và điều phối nghiệp vụ
  worker/     Điểm vào cho queue, transcription và render
packages/
  contracts/  Kiểu dữ liệu dùng chung giữa các ứng dụng
  ai-provider/ Adapter AI, hiện hỗ trợ Google Gemini
docs/         Ghi chú kiến trúc và ranh giới MVP
compose.yaml  PostgreSQL, Redis và MinIO cho local development
```

## Khởi động local

1. Sao chép `.env.example` thành `.env`.
2. Đổi `SESSION_SECRET` thành một chuỗi ngẫu nhiên dài.
3. Điền `GEMINI_API_KEY` nếu muốn dùng Gemini. Có thể để trống trong lúc phát
   triển; hệ thống sẽ dùng đánh giá fallback để toàn bộ flow vẫn chạy được.
4. Cài dependencies bằng `npm install`.
5. Chạy hạ tầng bằng `npm run infra:up`.
6. Chạy từng ứng dụng trong terminal riêng:

```text
npm run dev:api
npm run dev:web
npm run dev:worker
```

Web mặc định ở `http://localhost:5173`, API health check ở
`http://localhost:3000/health`, PostgreSQL local ở cổng `5433` và MinIO Console
ở `http://localhost:9001`.

`GEMINI_API_KEY` chỉ được đọc ở backend và không được gửi xuống trình duyệt.
Model mặc định là `gemini-3.5-flash-lite`; có thể đổi bằng `GEMINI_MODEL`.

## Trạng thái hiện tại

- Đăng ký, đăng nhập, đăng xuất và khôi phục phiên qua cookie `HttpOnly`.
- Mật khẩu được băm bằng `scrypt`; backend chỉ lưu hash và salt.
- Tài khoản, session, CreatorDNA, tín hiệu tích lũy và lịch sử đánh giá AI được
  lưu trong PostgreSQL theo từng người dùng.
- Onboarding CreatorDNA là tùy chọn khi đăng ký. Tiến độ 6 câu hỏi được tự lưu,
  có thể tiếp tục sau và có thể chỉnh sửa.
- Có hai mốc đánh giá người dùng: ngay sau đăng ký và sau khi hoàn thành 6 câu
  hỏi. Gemini trả về JSON có schema; nếu chưa có key hoặc provider lỗi, backend
  ghi nhận một kết quả fallback an toàn.
- Frontend đã nối các route `/api/auth/*` và `/api/creator-dna/*`; không còn lưu
  tài khoản hoặc CreatorDNA trong `localStorage`.

## Kiểm tra trước khi commit

```text
npm run check
```

Lệnh trên kiểm tra type, lint và build toàn bộ workspace.
