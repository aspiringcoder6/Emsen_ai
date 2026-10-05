# Thử tạo ảnh storyboard miễn phí

Cập nhật ngày 05/10/2026. Nhà cung cấp thử nghiệm: **Cloudflare Workers AI**, model **FLUX.1 Schnell** (`@cf/black-forest-labs/flux-1-schnell`).

## Bạn cần chuẩn bị gì?

1. Tạo hoặc dùng tài khoản [Cloudflare](https://dash.cloudflare.com/) và giữ **Workers Free**. Free hiện có 10.000 neurons/ngày, dùng chung cho các tác vụ Workers AI trên tài khoản, đặt lại lúc 00:00 UTC / 07:00 Việt Nam. Trên gói Free, hết quota thì yêu cầu thất bại. Nếu tài khoản đã ở Workers Paid, phần vượt quota có thể bị tính phí; giới hạn trong ứng dụng không xác minh được billing bên Cloudflare. Không nâng cấp gói hoặc thêm AI Gateway trả phí để làm demo này. [Nguồn giá và hạn mức](https://developers.cloudflare.com/workers-ai/platform/pricing/).
2. Vào **Workers AI → Use REST API → Create a Workers AI API Token**; lưu token và **Account ID**. Dùng template có sẵn. Nếu tạo token thủ công, cấp **Workers AI – Read** và **Workers AI – Edit**, giới hạn vào đúng tài khoản. Không dùng Global API Key. Backend hiện tại gọi REST API trực tiếp, không cần deploy một Cloudflare Worker. [Hướng dẫn chính thức](https://developers.cloudflare.com/workers-ai/get-started/rest-api/).
3. Thêm các dòng sau vào `.env` ở thư mục gốc dự án; thay hai giá trị giữ chỗ bằng giá trị thật. Không gửi token trong chat và không dùng tiền tố `VITE_`.

```dotenv
IMAGE_GENERATION_PROVIDER=cloudflare-workers-ai
IMAGE_GENERATION_MODEL=@cf/black-forest-labs/flux-1-schnell
CLOUDFLARE_ACCOUNT_ID=your_32_character_account_id
CLOUDFLARE_API_TOKEN=your_workers_ai_api_token
IMAGE_GENERATION_TIMEOUT_MS=90000
IMAGE_GENERATION_DAILY_USER_LIMIT=20
IMAGE_GENERATION_DAILY_WORKSPACE_LIMIT=50
```

Đây là token riêng của Cloudflare; **Gemini API key hiện tại không dùng để gọi Cloudflare**. Hai dịch vụ text và ảnh được cấu hình độc lập. `.env` được Git bỏ qua; không chép token vào mã nguồn, screenshot hoặc tài liệu.

4. Chạy PostgreSQL và MinIO của dự án, rồi chạy API, web và worker ở các terminal riêng:

```text
npm run infra:up
npm run dev:api
npm run dev:web
npm run dev:worker
```

Nếu đã chạy, khởi động lại API và worker sau khi đổi `.env`. API tự áp dụng migration 17–18 khi khởi động; hãy chạy API trước worker. Khi deploy, cấu hình cùng các biến `IMAGE_GENERATION_*`, `CLOUDFLARE_*`, `DATABASE_URL` và `MEDIA_STORAGE_*` ở cả API và Background Worker. Token chỉ tồn tại phía server, không được trả trong API trạng thái.

Trong phiên kiểm thử, image `minio/mc:latest` của bước `minio-init` không tải được. PostgreSQL và MinIO đã có sẵn vẫn chạy được bằng:

```text
docker compose up -d --pull never postgres minio
```

Nếu bucket chưa có, đặt `MEDIA_STORAGE_AUTO_CREATE_BUCKET=true` cho môi trường local để API tạo bucket. Production nên tạo bucket private trước và giữ tùy chọn này tắt.

## Thử trong giao diện

Mở **Kịch bản → Storyboard → chọn cảnh**. Nhập **Hình ảnh / hành động**, chọn Phác thảo / Điện ảnh / Minh họa màu, thêm mô tả nếu cần, rồi bấm **Tạo ảnh cho cảnh này**. Tác vụ đi qua worker, trạng thái tự cập nhật và tồn tại khi mở lại kịch bản.

Ảnh hoàn tất xuất hiện trong danh sách phương án. Bấm **Dùng ảnh này**, rồi **Lưu** kịch bản. Tạo thêm phương án không đổi ảnh đang chọn; ảnh lỗi không ghi đè cảnh. Nếu mô tả đã đổi, ảnh cũ được đánh dấu “Theo mô tả trước”. Chữ/font/màu, lời thoại và timing vẫn là dữ liệu riêng. Không gửi toàn bộ kịch bản, CreatorDNA hoặc chữ overlay cho Cloudflare; chỉ gửi tên cảnh, mô tả hình ảnh, chỉ dẫn quay và mô tả bổ sung của cảnh đang chọn, kèm hướng dẫn phong cách/bố cục.

Cần mở khóa và lưu cảnh nếu cảnh đang khóa trong bản đã lưu. Các cảnh mới hoặc chỉnh sửa chưa lưu được gửi dưới dạng snapshot của draft; tạo ảnh không tự lưu hoặc sửa JSON của kịch bản. Nhớ lưu storyboard trước khi rời trang nếu đã thay nội dung.

FLUX.1 Schnell trong adapter hiện tại nhận text, seed và 4 steps; tài liệu không công bố tham số đảm bảo tỷ lệ đầu ra hay ảnh tham chiếu. Adapter báo hai khả năng này là chưa hỗ trợ; UI giữ toàn bộ ảnh trong khung video. Có thể mô tả một nhân vật nhất quán, nhưng chưa cam kết giữ chính xác cùng nhân vật qua nhiều cảnh. [Thông tin model](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/).

## Giới hạn và xử lý lỗi

- Mặc định 20 yêu cầu được nhận/người/ngày và 50 yêu cầu dùng chung/ngày UTC. Đây là giới hạn của ứng dụng, không phải số ảnh Cloudflare cam kết miễn phí. Lượt lỗi vẫn tính để giới hạn thử nghiệm; giới hạn dùng chung không biến mất khi xóa kịch bản.
- Tối đa 3 tác vụ đang chờ/chạy cho một người; mỗi cảnh chỉ có một tác vụ đang hoạt động. Tối đa 64 ảnh cho mỗi kịch bản, tính cả ảnh đang chờ và ảnh chưa chọn; UI hiện tối đa 6 phương án mới nhất của cảnh.
- Mã yêu cầu chống gửi lặp. Gửi lại cùng mã/nội dung trả tác vụ cũ, không đặt thêm lượt. Worker không tự thử lại sau timeout, gián đoạn, quota hoặc lỗi kết nối; lượt bên dịch vụ có thể đã được sử dụng. Bấm tạo lại là yêu cầu mới và tính thêm một lượt.
- Không tự chuyển sang Gemini hoặc một dịch vụ trả phí khi Cloudflare lỗi. Khi đổi provider/model trong cấu hình, job cũ dùng cấu hình khác sẽ thất bại trước khi gọi provider mới.
- Tác vụ chạy bị gián đoạn quá 5 phút hoặc chờ quá 30 phút được worker đánh dấu lỗi. Nếu không có worker hoạt động, việc khôi phục cũng chưa chạy; khởi động worker trước khi thử lại.
- Ảnh PNG/JPEG/WebP tối đa 3 MB được lưu trong bucket private; URL đọc có thời hạn và kiểm tra user/script. Metadata ghi provider/model/prompt/seed/style để truy vết. Chưa có tác vụ định kỳ dọn object mồ côi khi process bị dừng giữa chừng; xóa script dọn object theo best effort.

## Đổi sang model/dịch vụ trả phí sau này

`packages/ai-provider/src/image.ts` định nghĩa `ImageGenerationProvider`, input, output ảnh và lỗi chung, cùng registry `registerImageProvider`. Cloudflare là một adapter riêng, không nằm trong code giao diện hoặc logic kịch bản.

Để bổ sung Gemini/Imagen, một dịch vụ ảnh khác hoặc model local:

1. Viết adapter thực hiện `generateImage()` và báo capabilities; giữ credentials riêng phía server. Đăng ký adapter trong cả API và worker, hoặc trong entry point chung của package. Factory có thể nhận credentials riêng qua closure/cấu hình server.
2. Đặt `IMAGE_GENERATION_PROVIDER` / `IMAGE_GENERATION_MODEL` tương ứng. API tạo job với provider/model cố định; worker không tự thay lựa chọn cho job đã có. Adapter Cloudflare hiện chỉ nhận model Schnell đã kiểm chứng; đổi sang model khác của Cloudflare cần bổ sung profile/adapter phù hợp thay vì chỉ đổi tên model.
3. Giữ nguyên API/DTO/job/UI cho text-to-image. Nếu thêm chỉnh ảnh/tham chiếu hoặc render đúng kích thước, mở rộng contract có version và UI theo capabilities; không silently bỏ qua dữ liệu tham chiếu.
4. Trước khi bật tự động hoặc trả phí, bổ sung báo giá/usage thực tế, ngân sách tiền, quy tắc cho phép của người dùng và audit. Các giới hạn hiện tại là số lượt, chưa thay thế được trần tiền cho provider trả phí.

Agent sau này dùng cùng `queueStoryboardImage` / `getStoryboardImageWorkspace`, với user context, revision, khóa cảnh và quota hiện có. Chưa bật Agent tự tạo ảnh ở slice này. Chọn ảnh vào draft và duyệt/xuất video là bước riêng.

## Kiểm thử

```text
npm run check
npm run test:storyboard --workspace @creator-flow/api
npm run test:storyboard --workspace @creator-flow/worker
npm run test:storyboard-integration --workspace @creator-flow/api
```

Kiểm thử provider thay HTTP Cloudflare bằng response mô phỏng. Kiểm thử tích hợp dùng PostgreSQL/MinIO thật và adapter fixture cục bộ, không dùng Cloudflare/Gemini credits. Luồng lưu ảnh, cách ly tài khoản, chọn/lưu/mở lại, idempotency và quota đã vượt qua. Tạo ảnh AI thật cần bạn thêm Account ID/token; chưa gọi thử Cloudflare trong phiên triển khai này.
