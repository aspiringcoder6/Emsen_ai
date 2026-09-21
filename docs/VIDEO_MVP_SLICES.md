# Video MVP — các vertical slice

## Slice 1 — Project và video đầu vào

Đã triển khai:

- Tạo Video Project từ đúng một kịch bản đã lưu.
- Chỉ nhận phạm vi MVP: video dọc 9:16, thành phẩm 30–180 giây.
- Lưu snapshot kịch bản để dự án không mất ngữ cảnh nếu kịch bản nguồn thay đổi.
- Upload trực tiếp 1–10 clip MP4/MOV/WebM vào bucket riêng tư, tổng tối đa 2 GB.
- URL upload hết hạn sau 15 phút; API xác nhận object và ownership trước khi cập nhật trạng thái.
- Có idempotency key cho tạo project, tạo upload và schema nền cho media job.
- Video Studio hiển thị pipeline: Video thô → Lời thoại → Smart Cut → Caption → Xuất video.

## Slice 2 — Quay trực tiếp, probe và transcript

Đã triển khai:

- Quay trực tiếp trong trình duyệt với camera + micro, preview dọc 9:16 và xem lại trước khi lưu.
- Kịch bản hiện tại làm teleprompter; có đếm ngược, chỉnh tốc độ/cỡ chữ, lật chữ, tạm dừng và quay lại.
- Worker nhận job từ bảng `media_jobs`, tải tệp riêng tư và kiểm tra codec, thời lượng, kích thước/hướng video bằng FFprobe.
- Từ chối có hướng dẫn khi tổng clip quá 15 phút hoặc video không phải khung dọc.
- Gửi clip đến Gemini Files API chỉ sau khi người dùng bấm tạo lời thoại; tệp Gemini được xóa khi xử lý xong.
- Tạo transcript tiếng Việt theo segment có timestamp; UI cho phép sửa, lưu nháp và duyệt.
- Có trình phát lại từng clip qua URL đọc có thời hạn để đối chiếu transcript mà không công khai bucket.
- API và UI tự theo dõi tiến trình `analyzing` → `transcribing` → `transcript-ready`.

## Slice 3 — Smart Cut

- Phát hiện khoảng lặng và từ đệm từ transcript/audio.
- Tạo edit-decision list, không tự ghi đè lựa chọn người dùng.
- UI bật/tắt từng đề xuất và xem tổng thời lượng dự kiến.

## Slice 4 — Caption, brand và render

- Preset Emsen Clean, logo/font/màu cơ bản và chuẩn hóa âm lượng.
- Render MP4 H.264/AAC bằng FFmpeg, progress/retry và output idempotent.
- URL tải thành phẩm có thời hạn; `video.render` luôn cần người dùng xác nhận.

## Biến môi trường production

Video không được lưu trên filesystem tạm của Render. API cần một bucket S3-compatible riêng tư:

- `MEDIA_STORAGE_ENDPOINT`
- `MEDIA_STORAGE_REGION`
- `MEDIA_STORAGE_BUCKET`
- `MEDIA_STORAGE_ACCESS_KEY`
- `MEDIA_STORAGE_SECRET_KEY`
- `MEDIA_STORAGE_AUTO_CREATE_BUCKET=false`
- `MEDIA_UPLOAD_EXPIRES_SECONDS=900`

Bucket cần cho phép CORS từ domain web đối với `PUT`, `GET` và `HEAD`; quyền của API
chỉ cần thao tác trên bucket media đã chọn. Bucket luôn để private, URL tải lên/phát
lại đều có chữ ký và tự hết hạn.
