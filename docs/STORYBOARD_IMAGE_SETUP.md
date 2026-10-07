# Thử tạo ảnh storyboard miễn phí

Cập nhật ngày 07/10/2026. Nhà cung cấp thử nghiệm: **Cloudflare Workers AI**, model **FLUX.1 Schnell** (`@cf/black-forest-labs/flux-1-schnell`).

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

Nếu chỉ demo ảnh storyboard, dùng `npm run dev:worker:images` thay cho
`npm run dev:worker`. Chế độ này chỉ nhận hàng đợi ảnh; các tác vụ video đang
chờ vẫn dành cho worker tổng hợp hoặc worker chạy với `--queue=media`.

Nếu đã chạy, khởi động lại API và worker sau khi đổi `.env`. API tự áp dụng migration 17–18 khi khởi động; hãy chạy API trước worker. Khi deploy, cấu hình cùng các biến `IMAGE_GENERATION_*`, `CLOUDFLARE_*`, `DATABASE_URL` và `MEDIA_STORAGE_*` ở cả API và Background Worker. Token chỉ tồn tại phía server, không được trả trong API trạng thái.

Trong phiên kiểm thử, image `minio/mc:latest` của bước `minio-init` không tải được. PostgreSQL và MinIO đã có sẵn vẫn chạy được bằng:

```text
docker compose up -d --pull never postgres minio
```

Nếu bucket chưa có, đặt `MEDIA_STORAGE_AUTO_CREATE_BUCKET=true` cho môi trường local để API tạo bucket. Production nên tạo bucket private trước và giữ tùy chọn này tắt.

## Khi deploy: tác vụ cứ ở queued, progress 0

`configured: true` trong API trạng thái chỉ xác nhận cấu hình provider/kho media của **API**. API lưu yêu cầu vào PostgreSQL; **ứng dụng `apps/worker` của Emsen** nhận và gọi Cloudflare. Cloudflare Workers AI không tự đọc hàng đợi trong database của Emsen. Nếu mã worker đang chạy chưa hỗ trợ storyboard, worker bị dừng, dùng database khác hoặc bị chặn khi xử lý video dài, job có thể vẫn ở `queued` dù API được cấu hình đúng.

Deploy một service xử lý nền chạy liên tục từ **thư mục gốc repository**, cùng phiên bản mã nguồn với API:

```sh
# Build service worker (bao gồm dependencies/compiler của monorepo)
npm ci --include=dev
npm run build:packages
npm run build --workspace @creator-flow/worker

# Start command của service xử lý nền
npm run start --workspace @creator-flow/worker
```

Có thể tách service ảnh khỏi video để video dài không chặn việc tạo ảnh.
Service ảnh dùng cùng bước build, với start command:

```sh
npm run start:images --workspace @creator-flow/worker
```

Worker mặc định vẫn xử lý cả hai hàng đợi. `--queue=images` chỉ nhận ảnh,
`--queue=media` chỉ nhận video; tham số không hợp lệ làm worker dừng trước
khi nhận tác vụ.

Service này cần `DATABASE_URL` trỏ đến **đúng cùng database** mà API ghi job, và cùng `IMAGE_GENERATION_PROVIDER`, `IMAGE_GENERATION_MODEL`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `MEDIA_STORAGE_*`. Dùng `NODE_ENV=production` trên deploy. Đặt biến ở API không tự đặt chúng cho service worker. Để xử lý video, worker còn cần `GEMINI_*` và `AI_KEY_ENCRYPTION_KEY` như README. API phải áp dụng migration trước khi worker khởi động.

Trong môi trường của worker đã build, có thể kiểm tra chỉ đọc, không tạo ảnh/tính thêm lượt:

```sh
npm run check:storyboard --workspace @creator-flow/worker
npm run check:storyboard --workspace @creator-flow/worker -- --job <UUID-cua-job>
```

Kết quả báo provider/storage có được cấu hình hay không, bảng còn thiếu, số tác vụ chờ/chạy và trạng thái job chỉ định. `ready: true` chỉ xác nhận các điều kiện cấu hình/database đã kiểm tra, không chứng minh process worker đang hoạt động hoặc token đã gọi Cloudflare thành công. Không thấy job đã có trong API là dấu hiệu cần kiểm tra database/phiên bản service; job cũng có thể đã bị xóa cùng kịch bản. Lệnh không in token, chuỗi kết nối, kho media hoặc nội dung cảnh.

Log worker mới có `consuming queues: media_jobs, storyboard_image_jobs` (hoặc chỉ `storyboard_image_jobs` trong service ảnh riêng), trạng thái cấu hình ảnh, rồi `processing job <id>` / `completed job <id>` hoặc mã lỗi. Nếu chỉ thấy worker cũ thông báo `media processor is ready`, hãy kiểm tra phiên bản worker và redeploy. Nếu thấy `could not start` / `polling failed`, xử lý lỗi database/migration trước. Worker tổng hợp chạy từng tác vụ và nhận ảnh sau khi video hiện tại hoàn tất; tách service ảnh nếu cần xử lý độc lập.

Khi Cloudflare từ chối, log ghi `httpStatus` và `providerCodes` dạng số.
Mã `5006` là lỗi định dạng yêu cầu; kiểm tra adapter theo schema model.
Nội dung lỗi thô không được ghi vì có thể chứa prompt hoặc thông tin riêng.

Đã sửa trường hợp chờ mãi: API cũng kết thúc job `queued` quá 30 phút hoặc `running` không cập nhật quá 5 phút khi đọc trạng thái/nhận yêu cầu mới của người dùng. Trạng thái chuyển sang `failed`, giao diện dừng polling tác vụ đó và cho phép thử lại thủ công. Không tự gọi lại Cloudflare và không hoàn lại sổ lượt đã nhận. Đây là xử lý tác vụ bị bỏ dở; để tạo được ảnh vẫn phải khởi động đúng worker. Sau khi cập nhật, redeploy cả API và worker.

## Thử trong giao diện

Mở **Kịch bản → Storyboard → chọn cảnh → tab Hình ảnh**. Nhập **Hình ảnh / hành động**, chọn **Creator · ảnh màu tự nhiên** (mặc định), **Minh họa nhân vật màu** hoặc **Điện ảnh**. Chọn **Động tác trong cảnh**: theo mô tả, nói trước camera, giới thiệu sản phẩm, mở hộp/khui gói, sử dụng/demo hoặc cận cảnh sản phẩm/B-roll. Thêm mô tả nếu cần, rồi bấm **Tạo ảnh cho cảnh này**. Prompt ưu tiên nhân vật ở tiền cảnh, khuôn mặt, hai tay và thao tác rõ; B-roll dùng bố cục cận cảnh sản phẩm. Tác vụ đi qua worker, trạng thái tự cập nhật và tồn tại khi mở lại kịch bản. Bạn có thể đổi sang tab Nội dung, Chữ hoặc Quay khi chờ; mô tả bổ sung và trạng thái tạo ảnh vẫn được giữ trong cùng cảnh.

Phác thảo không còn là lựa chọn cho lượt tạo mới trong giao diện. Ảnh và job sketch đã có vẫn mở được; tạo phương án mới, chọn **Dùng ảnh này** rồi **Lưu** để thay ảnh cũ. Không tự tạo lại toàn bộ board.

Trong cùng tab, mở **Dùng avatar Emsen gốc**, chọn tư thế/biểu cảm và bấm **Dùng Emsen cho cảnh**, rồi **Lưu**. Có 13 ảnh PNG gốc sẵn có: giới thiệu, chào, hào hứng, ngạc nhiên, suy nghĩ, dễ thương, hài lòng, đứng, ngồi, nảy ý tưởng, điểm lại, làm việc và ghi chép. Ảnh được tải vào kho media riêng qua service upload hiện có, giữ nền trong suốt và thay ảnh minh họa hiện tại; kết hợp với lời thoại/lớp chữ của cảnh. Cách này không gọi AI hoặc tốn lượt tạo ảnh, không cần API key, nhưng vẫn tính giới hạn ảnh lưu của kịch bản. Đây là các tư thế có sẵn; chưa ghép avatar vào bối cảnh AI hoặc tạo động tác mới như cầm đúng sản phẩm trong cảnh.

Ảnh hoàn tất xuất hiện trong danh sách phương án. Bấm **Dùng ảnh này**, rồi **Lưu** kịch bản. Tạo thêm phương án không đổi ảnh đang chọn; ảnh lỗi không ghi đè cảnh. Nếu mô tả đã đổi, ảnh cũ được đánh dấu “Theo mô tả trước”. Chữ/font/màu, lời thoại và timing vẫn là dữ liệu riêng. Không gửi toàn bộ kịch bản, CreatorDNA hoặc chữ overlay cho Cloudflare; chỉ gửi mô tả hình ảnh, chỉ dẫn quay và mô tả bổ sung của cảnh đang chọn, kèm hướng dẫn phong cách/động tác/bố cục. Tên cảnh vẫn nằm trong snapshot nội bộ, nhưng không đưa vào prompt ảnh để nhãn như “Hook” không bị hiểu thành đồ vật.

Cần mở khóa và lưu cảnh nếu cảnh đang khóa trong bản đã lưu. Các cảnh mới hoặc chỉnh sửa chưa lưu được gửi dưới dạng snapshot của draft; tạo ảnh không tự lưu hoặc sửa JSON của kịch bản. Nhớ lưu storyboard trước khi rời trang nếu đã thay nội dung.

FLUX.1 Schnell trong adapter hiện tại nhận `prompt` và `steps: 4`. Schema REST kiểm tra trực tiếp ngày 06/10/2026 đặt `additionalProperties: false` và không nhận `seed`; gửi trường này làm yêu cầu không hợp lệ. Adapter đã bỏ `seed` khỏi HTTP request; interface chung vẫn giữ seed để adapter khác có thể hỗ trợ. Không có tham số đảm bảo tỷ lệ đầu ra hay ảnh tham chiếu trong schema này. Adapter báo hai khả năng này là chưa hỗ trợ; UI giữ toàn bộ ảnh trong khung video. Có thể mô tả một nhân vật nhất quán, nhưng chưa cam kết giữ chính xác cùng nhân vật qua nhiều cảnh. [Thông tin model](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/), [API đọc schema](https://developers.cloudflare.com/api/resources/ai/subresources/models/subresources/schema/methods/get/).

## Giới hạn và xử lý lỗi

- Mặc định 20 yêu cầu được nhận/người/ngày và 50 yêu cầu dùng chung/ngày UTC. Đây là giới hạn của ứng dụng, không phải số ảnh Cloudflare cam kết miễn phí. Lượt lỗi vẫn tính để giới hạn thử nghiệm; giới hạn dùng chung không biến mất khi xóa kịch bản.
- Tối đa 3 tác vụ đang chờ/chạy cho một người; mỗi cảnh chỉ có một tác vụ đang hoạt động. Tối đa 64 ảnh cho mỗi kịch bản, tính cả ảnh đang chờ và ảnh chưa chọn; UI hiện tối đa 6 phương án mới nhất của cảnh.
- Mã yêu cầu chống gửi lặp. Gửi lại cùng mã/nội dung trả tác vụ cũ, không đặt thêm lượt. Worker không tự thử lại sau timeout, gián đoạn, quota hoặc lỗi kết nối; lượt bên dịch vụ có thể đã được sử dụng. Bấm tạo lại là yêu cầu mới và tính thêm một lượt.
- Không tự chuyển sang Gemini hoặc một dịch vụ trả phí khi Cloudflare lỗi. Khi đổi provider/model trong cấu hình, job cũ dùng cấu hình khác sẽ thất bại trước khi gọi provider mới.
- Tác vụ chạy bị gián đoạn quá 5 phút hoặc chờ quá 30 phút được worker đánh dấu lỗi; API cũng xử lý job quá hạn của người dùng khi đọc trạng thái hoặc nhận yêu cầu mới, kể cả khi worker ngừng hoạt động. Khởi động đúng worker trước khi thử lại.
- Ảnh PNG/JPEG/WebP tối đa 3 MB được lưu trong bucket private; URL đọc có thời hạn và kiểm tra user/script. Metadata ghi provider/model/prompt/style/creatorAction và `requestedSeed` của interface chung để truy vết; Cloudflare Schnell hiện không dùng seed đó, nên không cam kết tái tạo ảnh bằng seed. Chưa có tác vụ định kỳ dọn object mồ côi khi process bị dừng giữa chừng; xóa script dọn object theo best effort.

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

Kiểm thử tự động thay HTTP Cloudflare bằng response mô phỏng. Kiểm thử tích hợp dùng PostgreSQL/MinIO thật và adapter fixture cục bộ, không dùng Cloudflare/Gemini credits. Luồng lưu ảnh, cách ly tài khoản, chọn/lưu/mở lại, idempotency và quota đã vượt qua.

Ngày 06/10/2026: 12 kiểm thử API/provider và 6 kiểm thử worker đều thành công, gồm validation động tác, idempotency khi đổi động tác, prompt creator có màu/nhân vật rõ, nhãn Hook không trở thành đồ vật và phân biệt “camera” với “cầm”. `npm run check` toàn dự án thành công sau bổ sung phong cách creator và chọn avatar gốc. Hai kiểm thử tích hợp PostgreSQL/MinIO đã thành công ở bước trước. Đã xác nhận API kết thúc job quá hạn khi không có worker, giữ usage và mã yêu cầu cũ, cho phép gửi lượt mới thủ công; lệnh chẩn đoán chỉ đọc kiểm tra đúng job/database mà không nhận hoặc tạo ảnh.

Chẩn đoán ứng dụng local đang chạy ngày 06/10/2026 tìm thấy API/web đang hoạt động nhưng không có process worker. Sau khi khởi động service ảnh và sửa trường `seed` không được schema cho phép, một lượt thử lại qua service enqueue thật đã hoàn thành `succeeded`/100% trong khoảng 2,3 giây và lưu ảnh Cloudflare vào kho media. Lượt thử lại dùng cùng mô tả cảnh đã được gửi trước đó, mã yêu cầu mới và giới hạn/sổ lượt hiện có. Worker không tự thử lại tác vụ lỗi. Job deploy được cung cấp trước đó không nằm trong database local; chưa có URL/log production để kiểm tra service deploy trực tiếp.

Kiểm tra giao diện ngày 07/10/2026 dùng tài khoản/kịch bản thử riêng và đúng Cloudflare adapter: chọn Creator · ảnh màu tự nhiên + Giới thiệu sản phẩm, tạo một ảnh thật hoàn thành 100% trong khoảng 7,8 giây. Ảnh có nhân vật màu ở tiền cảnh và hai tay cầm sản phẩm. Cảnh thứ hai chọn PNG Emsen Hào hứng gốc, không gọi AI. Cả hai ảnh và lớp chữ giữ nguyên sau chọn/lưu/mở lại; metadata ảnh AI ghi `creator`/`show-product`. Build web sau chỉnh khoảng trống tránh nút chat nổi cũng thành công. Minh chứng: `tmp/storyboard-creator-style.jpg`.
