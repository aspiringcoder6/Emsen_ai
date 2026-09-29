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

Đã triển khai trong Slice 3.1:

- Chỉ bắt đầu sau khi người dùng duyệt transcript; worker dùng lại Gemini model và Google AI key hiện có.
- Chỉ gửi tên dự án, thời lượng mục tiêu và transcript có timestamp tới Gemini ở bước này; không gửi lại file video.
- Gemini đánh giá cả giá trị nội dung và độ an toàn của mạch nối. Đoạn chưa chắc chắn luôn được giữ mặc định.
- Hook và đoạn kết được bảo vệ; tổng lời nói AI tự đề xuất cắt không vượt quá 35% trong một lần duyệt.
- Khoảng lặng dài chỉ cắt phần giữa, chừa room tone ở hai đầu để chuẩn bị cho audio crossfade khi render.
- Tạo edit-decision list có version, gắn với đúng revision của transcript và không ghi đè video nguồn.
- UI timeline cho phép giữ/cắt từng đoạn, xem thời lượng dự kiến, hoàn tác, dùng lại đề xuất AI và duyệt bản cắt.
- Nếu transcript thay đổi, bản cắt được đánh dấu cũ và yêu cầu tạo gợi ý mới thay vì âm thầm áp dụng sai timestamp.

Đã triển khai trong Slice 3.2:

- Worker dùng FFmpeg đóng gói cùng ứng dụng để chuẩn hóa các clip và tạo proxy MP4 H.264/AAC 360×640.
- Edit-decision list được đổi thành các khoảng cần giữ trên timeline toàn cục, hỗ trợ dự án có nhiều clip nguồn.
- Các khoảng giữ cực ngắn dưới 180 ms giữa hai cuts được gộp để tránh flash hình và tiếng click.
- Âm thanh fade 70 ms ở hai phía mỗi điểm nối; phần room tone đã chừa từ Slice 3.1 tiếp tục giúp câu nói có nhịp thở.
- Preview được lưu như output riêng trong bucket private và phát bằng URL có chữ ký; video nguồn không bị thay đổi.
- Preview luôn gắn với đúng revision của Smart Cut. Sửa lựa chọn giữ/cắt sẽ tự đánh dấu preview cũ.
- Khi có đoạn bị cắt, người dùng phải tạo và nghe preview mới nhất trước khi có thể duyệt Smart Cut.
- Chỉ giữ một preview hiện hành trong cơ sở dữ liệu; object preview cũ được dọn sau khi bản mới lưu thành công.

## Slice 4 — Caption, brand và render

Đã triển khai:

- Preset Emsen Clean burn-in phụ đề theo transcript, tự dồn timestamp về timeline sau Smart Cut và chia câu thành các nhịp ngắn dễ đọc.
- Giao diện tối giản có preview phong cách; phần nâng cao cho phép đổi vị trí, màu chữ, màu nhấn và bật/tắt logo Emsen.
- Worker render MP4 H.264/AAC 720×1280 bằng FFmpeg, giữ audio fade ở điểm nối và chuẩn hóa âm lượng về mục tiêu -16 LUFS.
- Job render có progress, retry bằng thao tác xuất lại, idempotency key và kiểm tra revision của transcript, Smart Cut lẫn cấu hình trước khi ghi nhận output.
- Bản xuất cũ được giữ an toàn; giao diện đánh dấu bản cũ khi Smart Cut hoặc caption thay đổi và ưu tiên bản mới nhất.
- Video hoàn chỉnh nằm trong bucket private, chỉ phát hoặc tải qua URL có chữ ký và tự hết hạn.
- `video.render` luôn yêu cầu người dùng xác nhận rõ ràng trong modal; video nguồn không bị ghi đè.
- Slice này không cần model AI hoặc API key mới; chỉ dùng FFmpeg đã đóng gói cùng worker.

## Biến môi trường production

Video không được lưu lâu dài trên filesystem tạm của Render. Worker chỉ dùng thư mục tạm khi xử lý rồi xóa; API cần một bucket S3-compatible riêng tư:

- `MEDIA_STORAGE_ENDPOINT`
- `MEDIA_STORAGE_REGION`
- `MEDIA_STORAGE_BUCKET`
- `MEDIA_STORAGE_ACCESS_KEY`
- `MEDIA_STORAGE_SECRET_KEY`
- `MEDIA_STORAGE_AUTO_CREATE_BUCKET=false`
- `MEDIA_UPLOAD_EXPIRES_SECONDS=900`
- `FFMPEG_BIN` (không bắt buộc; dùng để ghi đè binary đi kèm worker)

Bucket cần cho phép CORS từ domain web đối với `PUT`, `GET` và `HEAD`; quyền của API
chỉ cần thao tác trên bucket media đã chọn. Bucket luôn để private, URL tải lên/phát
lại đều có chữ ký và tự hết hạn.
