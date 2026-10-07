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
  ai-provider/ Adapter text Google Gemini và tạo ảnh Cloudflare Workers AI
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

Để thử riêng ảnh storyboard, chạy `npm run dev:worker:images` thay cho worker
tổng hợp. Khi deploy service ảnh riêng, dùng
`npm run start:images --workspace @creator-flow/worker`; service này chỉ nhận
`storyboard_image_jobs`, nên video đang xử lý không làm ảnh phải chờ.

Web mặc định ở `http://localhost:5173`, API health check ở
`http://localhost:3000/health`, PostgreSQL local ở cổng `5433` và MinIO Console
ở `http://localhost:9001`.

`GEMINI_API_KEY` chỉ được đọc ở backend và không được gửi xuống trình duyệt.
Model mặc định là `gemini-3.5-flash-lite`; có thể đổi bằng `GEMINI_MODEL`.

Video Studio dùng MinIO khi chạy local. `docker compose` tự tạo bucket riêng tư
`creatorflow-media`; video được tải thẳng từ trình duyệt bằng URL có thời hạn,
không đi qua bộ nhớ API. Khi deploy, cấu hình nhóm biến `MEDIA_STORAGE_*` trong
`.env.example` bằng một kho S3-compatible bên ngoài Render.

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
- Video Studio đã nối kịch bản → dự án video → quay trực tiếp bằng camera/teleprompter
  hoặc upload 1–10 clip MP4/MOV/WebM (tối đa 2 GB).
- Worker dùng FFprobe để kiểm tra video dọc và Gemini để tạo transcript tiếng Việt có
  timestamp; người dùng sửa và duyệt transcript trước bước Smart Cut.
- Smart Cut dùng Gemini để đề xuất giữ/cắt, sau đó worker tạo proxy MP4 360×640 bằng
  FFmpeg để người dùng nghe mạch nối trước khi duyệt. Preview nằm trong bucket riêng tư
  và không ghi đè video nguồn.

Khi deploy, `apps/worker` phải chạy như một Background Worker riêng với lệnh
`npm run start --workspace @creator-flow/worker`. Worker dùng chung `DATABASE_URL`,
`AI_KEY_ENCRYPTION_KEY`, `GEMINI_*` và `MEDIA_STORAGE_*` với API. Camera trên trình
duyệt yêu cầu domain HTTPS (Render đã cung cấp HTTPS).

## Kiểm tra trước khi commit

Storyboard trực quan được chia thành các slice tại [docs/STORYBOARD_SLICES.md](docs/STORYBOARD_SLICES.md).
Slice 1 bổ sung tab Storyboard trong Kịch bản, ảnh minh họa tải lên riêng tư và
lớp chữ chỉnh font/màu/vị trí; cần PostgreSQL và kho media hiện có để lưu ảnh.
Slice 2 thêm tạo ảnh theo cảnh qua Cloudflare Workers AI Free, hàng đợi và chọn
phương án ảnh. Cần Account ID/API Token riêng, cấu hình ở cả API và worker;
xem [docs/STORYBOARD_IMAGE_SETUP.md](docs/STORYBOARD_IMAGE_SETUP.md).

Ảnh mới mặc định theo phong cách creator có màu, với lựa chọn động tác trước
camera, giới thiệu sản phẩm, mở hộp, demo và B-roll. Tab Hình ảnh cũng cho chọn
avatar Emsen gốc theo tư thế/biểu cảm sẵn có, không cần gọi AI hoặc API key.

Nếu tạo ảnh trên deploy cứ ở `queued`/0%, kiểm tra worker chạy cùng phiên bản
và cùng database với API. Sau khi build worker, lệnh
`npm run check:storyboard --workspace @creator-flow/worker -- --job <UUID>`
kiểm tra cấu hình, bảng và job mà không gọi Cloudflare. Xem mục xử lý `queued`
trong tài liệu setup ở trên để cấu hình build/start và đọc log worker.

Adapter FLUX.1 Schnell chỉ gửi `prompt` và `steps` theo schema đang hoạt động
của Cloudflare. Log lỗi giữ HTTP status và mã lỗi số, không ghi token hoặc
nội dung cảnh.

```text
npm run check
```

Lệnh trên kiểm tra type và build toàn bộ workspace.
