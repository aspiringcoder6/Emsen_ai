# Storyboard trực quan — các slice triển khai

Ngày cập nhật: 07/10/2026. Phát triển tiếp từ storyboard text trong Kịch bản.

| Slice | Nội dung | Nghiệm thu | Trạng thái |
| --- | --- | --- | --- |
| 1 · Board thủ công | Tab Lời thoại/Storyboard; thẻ ảnh + lớp chữ; tải ảnh riêng tư; chỉnh cảnh; kéo thả hoặc nút đổi thứ tự; khóa cảnh; lưu/mở lại | Kịch bản cũ vẫn mở; ảnh/chữ giữ sau lưu; chặn ảnh khác chủ/kịch bản; AI chia cảnh giữ minh họa đã chọn | Đã triển khai trong mã nguồn |
| 2 · Minh họa AI theo cảnh | Adapter tạo ảnh, job/progress/retry thủ công, style, biến thể, usage và hạn mức | Chỉ tạo cảnh được chọn; job cũ không tự thay cảnh mới; báo quota; giữ ảnh chọn hiện tại khi lỗi | Đã triển khai và kiểm tra tạo ảnh Cloudflare thật trên local ngày 06/10/2026. Ảnh tham chiếu và kiểm soát nhân vật để bước mở rộng vì model demo chưa hỗ trợ |
| 3 · Liên kết Video Studio | Snapshot board theo revision; gắn clip/đoạn clip vào scene ID; xem nhanh các cảnh theo thời lượng; nhập chữ/ảnh được chọn vào timeline nháp | Ảnh tham chiếu không tự chèn vào video; thay timing không lệch liên kết; cập nhật board có lựa chọn | Chưa triển khai |
| 4 · Skill Agent | Đọc/chia/sửa/minh họa cảnh, tạo draft timeline; chủ động khi được bật; cảnh khóa, version check và trần chi phí | UI và Agent gọi cùng service; không tự duyệt/xuất; không ghi đè phần người dùng giữ | Chưa triển khai |

## Slice 1 — cách sử dụng và phạm vi

Mở một kịch bản → tab Storyboard → thêm cảnh hoặc dùng trợ lý chia cảnh text hiện có → chọn cảnh → tab Hình ảnh để tải PNG/JPEG/WebP tối đa 3 MB → tab Chữ để thêm chữ, chọn font hệ thống (Arial/Georgia/Courier), cỡ, màu chữ/nền và vị trí trên/giữa/dưới → bấm Lưu. Ảnh được hiển thị theo tỷ lệ của kịch bản và giữ toàn bộ hình (contain), không tự crop. Thẻ cảnh phản ánh trực tiếp lớp chữ.

Phần chỉnh cảnh được chia thành bốn tab: **Nội dung** (tên, lời thoại, thời lượng, nhịp cảm xúc), **Hình ảnh** (hành động, avatar Emsen gốc, tải ảnh, minh họa AI), **Chữ** (lớp chữ và định dạng), **Quay** (chỉ dẫn, mục đích, B-roll, chuyển cảnh, vai trò giữ chân). Bảng có chiều cao giới hạn, cuộn riêng phần nội dung; tiêu đề cảnh, nút khóa/đổi thứ tự/xóa và hàng tab vẫn ở trên. Đổi tab giữ mô tả tạo ảnh và tác vụ đang chạy; chọn cảnh khác giữ tab đang dùng. Có thể chuyển tab bằng phím mũi tên trái/phải, Home/End.

Nút **Nhờ Emsen chia cảnh** mở ô yêu cầu ngay bên dưới thanh công cụ storyboard, trước danh sách cảnh. Trang đưa ô này vào tầm nhìn và đặt con trỏ vào ô nhập. Đóng bằng nút hoặc Escape sẽ trả focus về nút mở. Thanh Lưu và bảng chỉnh cảnh bám theo khi cuộn trên màn hình lớn.

Kiểm tra cải thiện giao diện ngày 05/10/2026: các component thật chạy với dữ liệu mẫu và dịch vụ ảnh mô phỏng cục bộ; đổi tab giữ prompt, tác vụ ảnh hoàn tất khi đang ở tab khác, chỉnh chữ/font/vị trí/thời lượng rồi lưu và mở lại bản mẫu. Đã kiểm tra chuyển tab bằng bàn phím, giữ tab khi chọn cảnh khác và vị trí bảng/hộp Emsen khi thanh công cụ xuống hai hàng ở chiều rộng 1040 px. Typecheck và build web đều thành công. Không gọi Cloudflare/Gemini trong lần kiểm tra này. Minh chứng: `tmp/storyboard-ux-tabs.jpg` và `tmp/storyboard-ux-emsen.jpg`.

Tối đa 16 cảnh và 64 lượt tải ảnh cho mỗi kịch bản, gồm các ảnh đã thay/gỡ để có thể dùng trong bản đang chỉnh. Khóa cảnh bảo vệ nội dung khỏi trợ lý AI chia lại; người dùng vẫn chỉnh tay hoặc xóa được. Nút lên/xuống hỗ trợ thao tác không cần kéo thả. Thời lượng tổng khác mục tiêu được nhắc để người dùng chỉnh lại.

Ảnh và text lưu tách nhau. Slice này chưa sinh ảnh AI, render animatic hoặc đưa ảnh/chữ storyboard vào MP4. Chữ trong board là thiết kế dự kiến; tính năng caption/render hiện tại tiếp tục dùng cấu hình riêng cho tới slice 3.

## Dữ liệu, API và bảo toàn

- `ScriptStoryboardFrameDto` có trường tùy chọn `illustrationAssetId`, `onScreenText` và `locked`; dữ liệu cũ nhận default khi đọc/parse.
- `onScreenText` gồm text tối đa 300 ký tự, font enum, màu #RRGGBB, vị trí và cỡ chữ. Lời thoại/ghi chú không tự trở thành overlay.
- Migration 17 tạo `storyboard_assets`, gắn theo user và script. Blob nằm trong bucket private hiện có; JSON kịch bản chỉ giữ ID, không giữ base64/signed URL.
- `POST /api/scripts/:scriptId/storyboard-assets` nhận ảnh base64 để vận chuyển trong request (không lưu base64), kiểm tra dung lượng, MIME/signature rồi tải vào bucket. Chưa mở presigned PUT cho browser ở slice này để giữ giới hạn ảnh tại API.
- `GET /api/scripts/:scriptId/storyboard-assets/:assetId` kiểm tra chủ sở hữu và kịch bản, trả URL đọc có hạn; UI làm mới URL trước hết hạn.
- Lưu board dùng API cập nhật kịch bản hiện có, kiểm tra revision và quyền sở hữu asset. ID cảnh không được trùng.
- AI chia cảnh text giữ ID cảnh được trả lại, giữ ảnh/chữ đã chọn và nội dung cảnh khóa; đề xuất bỏ cảnh có công việc trực quan sẽ được bổ sung lại thay vì làm mất dữ liệu.
- UI giữ chỉnh sửa tại draft và cần bấm Lưu như kịch bản. Ảnh upload chưa lưu vào cảnh hoặc đã gỡ vẫn được giữ trong quota của kịch bản. Xóa kịch bản dọn object theo best effort; chưa có tác vụ định kỳ dọn object mồ côi khi process bị dừng/kho media lỗi. Bổ sung dọn rác trước khi mở upload quy mô lớn. Revision phục vụ kiểm tra xung đột; slice 1 chưa bổ sung lịch sử toàn bộ bản storyboard cũ.

## Kiểm tra

`npm run check` kiểm tra type và build toàn workspace. `npm run test:scripts --workspace @creator-flow/api` kiểm tra luồng kịch bản hiện có. `npm run test:storyboard --workspace @creator-flow/api` kiểm tra tương thích dữ liệu cũ, overlay, giới hạn/MIME ảnh và bảo toàn ảnh/chữ/cảnh khóa khi AI viết lại.

`npm run test:storyboard-integration --workspace @creator-flow/api` cần PostgreSQL và MinIO local. Test tạo user/script riêng, tải ảnh nhỏ, lưu/mở lại, kiểm tra revision, cách ly tài khoản/kịch bản và dọn file khi xóa. Không gọi Gemini hoặc dùng phí tạo ảnh.

Kết quả cập nhật ngày 05/10/2026: 8 test kịch bản, 10 test storyboard/provider/API, 3 test worker ảnh và 6 test video worker vượt qua. Hai kiểm thử tích hợp PostgreSQL/MinIO thật cũng vượt qua: tải ảnh thủ công và queue ảnh AI với adapter fixture, chọn/lưu/mở lại, quyền riêng tư và dọn ảnh. Giao diện slice 2 được kiểm tra với ứng dụng/API/database/storage thật và adapter ảnh mẫu cục bộ: tạo phương án, chọn/lưu/mở lại, đổi mô tả, lỗi quota giữ ảnh và thử lại thủ công. Minh chứng giao diện: `tmp/storyboard-image-demo.jpg`. HTTP Cloudflare dùng mock/fixture trong kiểm thử; tạo ảnh thật chưa chạy vì thiếu Account ID/token.

## Slice 2 — demo tạo ảnh miễn phí

Đã thêm hộp Minh họa bằng AI trong phần chỉnh từng cảnh, ba phong cách, tạo thêm phương án, trạng thái xử lý và chọn ảnh để đưa vào draft. Worker không sửa nội dung storyboard; người dùng chọn ảnh rồi bấm Lưu. Provider, model, prompt và requestedSeed được ghi trong metadata; Cloudflare Schnell hiện không dùng seed, token ở backend. Migration 18 thêm job và sổ lượt sử dụng theo UTC; quota mặc định 20 lượt/người và 50 lượt dùng chung mỗi ngày.

Mặc định mới là **Creator · ảnh màu tự nhiên**, tập trung vào nhân vật, biểu cảm, dáng và tay thao tác. Có lựa chọn động tác nói trước camera/giới thiệu sản phẩm/mở hộp/demo/B-roll; “theo mô tả” suy ra động tác từ phần hình ảnh. Hai phong cách khác là Minh họa nhân vật màu và Điện ảnh. Nhãn cảnh như Hook/CTA không đưa vào prompt ảnh; dữ liệu sketch cũ vẫn đọc được và chỉ thay khi người dùng chọn ảnh mới.

Để dùng đúng nhận diện Emsen ở demo miễn phí, tab Hình ảnh có mục thu gọn chọn 13 ảnh avatar gốc theo tư thế/biểu cảm. Chọn avatar dùng chung service upload/lưu ảnh riêng tư, không gọi provider và không tốn lượt AI. Ảnh gốc thay minh họa của cảnh, giữ lớp chữ/lời thoại; chưa ghép avatar vào nền hoặc sinh tư thế mới từ ảnh tham chiếu. Khi bổ sung model hỗ trợ tham chiếu, có thể mở rộng input/capabilities và dùng cùng quy trình job, quyền sở hữu, chọn/lưu như ảnh creator hiện tại.

Kiểm tra ngày 07/10/2026: một ảnh creator thật qua Cloudflare hoàn thành 100% trong khoảng 7,8 giây; chọn ảnh và một avatar Emsen gốc vào hai cảnh, lưu/mở lại giữ đúng ảnh và lớp chữ. 12 kiểm thử API/provider, 6 kiểm thử worker và typecheck/build toàn workspace thành công. Bảng chỉnh cảnh chừa khoảng trống dưới màn hình lớn cho nút emsen buddy. Minh chứng: `tmp/storyboard-creator-style.jpg`.

Ngày 06/10/2026: xác nhận lỗi local do chưa chạy worker và adapter gửi `seed` ngoài schema Cloudflare. Đã thêm `npm run dev:worker:images` / `npm run start:images --workspace @creator-flow/worker`, bỏ trường không hỗ trợ và giữ mã lỗi số an toàn trong log. Lượt thử lại thật qua enqueue/worker đạt 100% và lưu ảnh trong khoảng 2,3 giây. Chi tiết vận hành tại [STORYBOARD_IMAGE_SETUP.md](STORYBOARD_IMAGE_SETUP.md).

Xem [STORYBOARD_IMAGE_SETUP.md](STORYBOARD_IMAGE_SETUP.md) để lấy Account ID/API Token, cấu hình local/deploy, hiểu giới hạn Free và bổ sung adapter khác về sau. Model demo text-to-image chưa có ảnh tham chiếu hoặc đảm bảo tỷ lệ đầu ra; đó là capability riêng để mở rộng.

## Gemini key và phương án demo

Dự án chọn key cá nhân đã mã hóa hoặc key workspace; model mặc định hiện tại là `gemini-3.5-flash-lite`. Adapter hiện phục vụ structured text, chưa sinh ảnh. Key có thể dùng cho model ảnh trong cùng Google project nếu được cấp quyền và có billing phù hợp; thành công với model text không xác nhận quyền tạo ảnh.

Theo [bảng giá Gemini](https://ai.google.dev/gemini-api/docs/pricing), kiểm tra ngày 01/10/2026, `gemini-3.1-flash-lite-image` không có API free tier; output ảnh 1K tương đương $0,0336/ảnh (chưa gồm input và text/thinking). `gemini-3.1-flash-image` cũng không có API free tier; output 1K khoảng $0,067/ảnh. Billing của key/project hiện tại chưa được xác minh; chưa gọi thử tạo ảnh hoặc thay đổi billing.

Demo miễn phí ngay ở slice 1: dùng ảnh tự có/tự tải lên. Nếu muốn tạo ảnh thử ngoài ứng dụng, [Hugging Face ZeroGPU Spaces](https://huggingface.co/docs/hub/spaces-zerogpu) có quota dùng demo giới hạn cho tài khoản miễn phí (hiện 5 phút GPU/ngày, có hàng đợi); chọn Space tạo ảnh đang hoạt động, tải kết quả và upload vào board. Đây là demo bên ngoài, chưa tích hợp làm backend của Emsen. [Inference Providers](https://huggingface.co/docs/inference-providers/pricing) có credit miễn phí hiện $0,10/tháng, phù hợp thử rất ít lượt API, không đủ làm cam kết cho pilot.

Không dùng `gemini-2.5-flash-image` cho tích hợp mới: bảng giá Google thông báo ngừng model ngày 02/10/2026. Slice 2 nên cho cấu hình model ảnh riêng, provider capability và giới hạn chi phí tách với model text.
