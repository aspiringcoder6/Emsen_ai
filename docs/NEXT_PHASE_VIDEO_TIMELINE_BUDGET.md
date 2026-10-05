# Kế hoạch giai đoạn tiếp theo — Nhận xét, chấm điểm và chỉnh sửa video nâng cao

Ngày lập: 01/10/2026. Trạng thái: đề xuất triển khai, chưa phải cam kết tiến độ hoặc báo giá.

## 1. Mục tiêu và quyết định đề xuất

Trong 8 tuần, đưa Emsen từ Smart Cut + caption sang một studio mà người dùng có thể tự xem nhận xét, sửa video, thêm chữ và hiệu ứng; đồng thời dùng chung các thao tác này làm skill để Agent chủ động tạo bản chỉnh sửa nháp.

Ưu tiên tích hợp editor mã nguồn mở, tùy biến giao diện theo Emsen và lưu dự án bằng định dạng của mình. Tuần đầu kiểm chứng OpenCut Classic; chưa chọn bản OpenCut đang viết lại làm nền production. Giữ FFmpeg hiện có cho các kiểu xuất đã hỗ trợ, bổ sung bộ chuyển đổi timeline thay vì xây engine dựng video từ đầu. Nếu Classic không đạt, đánh giá phương án có giấy phép thương mại hoặc giảm phạm vi trước khi mở rộng công việc.

Ngân sách đề xuất cho 8 tuần: **8.125.000 đồng tiền chạy thử**, chưa gồm công phát triển. Nếu quy đổi công theo giả định bên dưới: **94.125.000–120.625.000 đồng tổng ngân sách**. Đây là hạn mức lập kế hoạch, không phải mức phí nhà cung cấp đã báo.

## 2. Nền tảng và phạm vi

Theo `docs/VIDEO_MVP_SLICES.md`, dự án đã có upload/quay, transcript tiếng Việt, Smart Cut theo phiên bản, proxy preview, caption có màu/vị trí và xuất MP4 720×1280 bằng FFmpeg. Kế hoạch phát triển tiếp trên những phần này. README và tài liệu kiến trúc có một số mô tả cũ; tuần 1 cần đối chiếu chức năng chạy thực tế trước khi chốt backlog.

Giả định nguồn lực: một kỹ sư full-time, chủ sản phẩm dành khoảng 0,5 ngày/tuần để duyệt, QA/design hỗ trợ bán thời gian. Video thử nghiệm dọc 9:16, thành phẩm 30–180 giây; 20 người dùng, 100 video, trung bình 90 giây. Ngày bắt đầu dự kiến 05/10/2026; nếu bắt đầu khác ngày, dịch các mốc theo tuần.

Phạm vi bắt buộc:

- Nhận xét có timestamp, bằng chứng và đề xuất sửa; điểm theo từng tiêu chí và điểm tổng.
- Editor tự thao tác: timeline nhiều lớp video/chữ, kéo vị trí chữ, sửa thời gian, font, cỡ chữ, màu, nền/viền, căn lề; undo/redo và lưu/mở lại.
- 5 font có dấu tiếng Việt đã kiểm chứng và giấy phép phù hợp; 3 bộ màu/thương hiệu; caption theo nhịp và chữ nhấn riêng.
- 4 hiệu ứng ban đầu: fade, chuyển cảnh dissolve, zoom nhấn nhẹ, chữ xuất hiện bằng fade/slide. Người dùng thêm tay hoặc bấm đề xuất tự động và sửa lại.
- Preview bản nháp, xuất video, lưu phiên bản, so sánh trước/sau và hoàn tác.
- Agent dùng cùng dịch vụ với UI để nhận xét và tạo bản edit nháp; chủ động trong phạm vi người dùng đã bật.

Để sau pilot: dựng video sinh bởi AI, avatar, kho nhạc/stock lớn, VFX phức tạp, cộng tác đồng thời, editor mobile đầy đủ, tự đăng mạng xã hội và cam kết điểm dự đoán lượt xem.

## 3. Chọn editor và bảo đảm tùy biến

| Phương án | Giá trị với Emsen | Giới hạn cần kiểm chứng | Quyết định |
| --- | --- | --- | --- |
| OpenCut Classic | Editor hiện hữu để khảo sát tái sử dụng UI/timeline; có quyền sửa mã theo giấy phép của phiên bản chọn | Là ứng dụng, chưa mặc định là SDK nhúng; phải đo công tách module, xử lý asset và chuyển timeline sang worker | Ưu tiên PoC tuần 1; pin commit và kiểm tra LICENSE/dependency của Classic |
| OpenCut bản viết lại | Định hướng Editor API, plugin, headless và MCP hợp với Agent | README nói đang viết lại; các mục trên là định hướng, chưa coi là khả năng sẵn sàng | Theo dõi, chưa đặt trên đường găng |
| OpenVideo / React Video Editor | UI React và nền dựng video có thể rút ngắn tích hợp | Giấy phép hiện có điều kiện Free/Company; không mặc định MIT hoặc miễn phí thương mại cho mọi công ty; kiểm tra cả Remotion | Phương án B nếu chấp nhận giấy phép và tổng công thấp hơn |
| Remotion | Tạo video bằng React, phù hợp chữ động và render theo dữ liệu | Là engine, cần editor/UI bổ sung; giấy phép có điều kiện và phải kiểm chứng kết quả preview/render | Chỉ cân nhắc cho renderer mở rộng, không thay toàn bộ studio ngay |

Thông tin trên được tra cứu ngày 01/10/2026 từ [OpenCut chính thức](https://github.com/OpenCut-app/OpenCut), [OpenCut Classic](https://github.com/opencut-app/opencut-classic), [giấy phép OpenVideo](https://github.com/openvideodev/react-video-editor/blob/main/LICENSE) và [Remotion](https://github.com/remotion-dev/remotion). OpenCut chính thức dẫn người dùng hiện tại sang Classic; không nhầm với các repo khác có cùng tên. Các đánh giá mức phù hợp là đề xuất của kế hoạch, chưa phải kết quả chạy PoC.

### Bài thử bắt buộc trong tuần 1

Chạy cùng một video 90 giây với hai clip, caption tiếng Việt, hai lớp chữ, một zoom và một dissolve. Đổi theme sang Emsen, thay panel công cụ, lưu/mở dự án và tạo cùng bản chỉnh sửa qua lệnh có cấu trúc. Xuất MP4 trên worker hoặc chứng minh đường chuyển đổi được.

Điều kiện chọn: đổi được bố cục/theme/panel; serialize được toàn bộ font/màu/timing/effect; không mất chỉnh sửa khi lưu/mở; UI và API tạo cùng kết quả; giấy phép phiên bản và dependency phù hợp sản phẩm; dự kiến tích hợp không vượt 10 ngày công sau PoC. Chấm 100 điểm: tùy biến UI 25, dữ liệu/API 25, preview–export 20, công tích hợp 20, khả năng bảo trì 10; yêu cầu ≥75 và không trượt điều kiện bắt buộc.

Kết thúc ngày 09/10 phải có video mẫu, bảng chấm, commit được chọn, danh sách dependency/license và ước lượng công. Nếu không đạt, giữ review + caption nâng cao + hiệu ứng giới hạn qua FFmpeg làm phạm vi 8 tuần; editor đầy đủ chuyển sang giai đoạn tiếp theo hoặc đổi nền với timeline mới.

### Tùy biến thuộc quyền kiểm soát của Emsen

- Giao diện: design token cho màu/cỡ chữ/spacing; cấu hình thanh công cụ, panel thuộc tính, workspace và trạng thái đơn giản/nâng cao. Tránh chỉ nhúng iframe khiến không kiểm soát được trải nghiệm.
- Video: preset thương hiệu gồm font, bảng màu, logo, vị trí an toàn, caption, hiệu ứng và cường độ; người dùng sửa được từng thuộc tính và lưu preset riêng.
- Dữ liệu: lưu timeline/preset tại backend Emsen; media dùng asset ID trong bucket private, URL ký được cấp lúc cần. Không ghi URL sắp hết hạn làm định danh asset.
- Tính mở rộng: adapter editor và renderer độc lập; hiệu ứng dùng ID cùng tham số đã kiểm tra. Chỉ bật hiệu ứng khi cả preview và export hỗ trợ. Không hứa preview giống export trước khi kiểm chứng.

## 4. Timeline triển khai

| Tuần / ngày | Công việc chính | Đầu ra và nghiệm thu | Phụ thuộc | Ngày công kỹ sư |
| --- | --- | --- | --- | ---: |
| 1 · 05–09/10 | Kiểm tra baseline; PoC editor; chọn rubric, bộ dữ liệu và định dạng timeline | Báo cáo chọn nền; video PoC; rubric v1; mẫu timeline có version | Chức năng MVP chạy được | 5 |
| 2 · 12–16/10 | Review API/job, kết quả có cấu trúc; chấm nội dung qua transcript và kỹ thuật qua probe | UI nhận xét có timestamp; xử lý lỗi không tạo điểm giả; baseline 20 video | Rubric, snapshot đầu vào | 5 |
| 3 · 19–23/10 | Review hình/âm thanh qua mẫu hoặc video; hiệu chỉnh rubric; nối editor với asset và lưu dự án | 30 video đối chiếu người chấm; editor mở được clip, save/reopen, undo/redo | Nền editor được chọn | 5 |
| 4 · 26–30/10 | Chữ/caption nhiều style, preset thương hiệu; nối preview–export cho lớp chữ | 5 font tiếng Việt, 3 palette; không lỗi dấu/cắt chữ; export đúng style | Timeline, font registry | 5 |
| 5 · 02–06/11 | 4 hiệu ứng; gợi ý tự thêm dựa trên transcript/review; người dùng sửa từng đề xuất | Mỗi hiệu ứng chỉnh thời gian/cường độ được; diff trước/sau; tối đa hiệu ứng theo preset | Renderer hỗ trợ các hiệu ứng | 5 |
| 6 · 09–13/11 | Đăng ký skill video; chạy review → đề xuất → tạo nháp → preview bằng Agent | 10 tình huống Agent; ownership, stale version, retry; UI và Agent dùng cùng service | Review và edit API ổn định | 5 |
| 7 · 16–20/11 | Pilot 20 người/100 video; đo thời gian, chi phí và độ hữu ích; sửa lỗi nghiêm trọng | Báo cáo theo video/job; phản hồi người dùng; không mất bản chỉnh tay | Luồng end-to-end | 5 |
| 8 · 23–27/11 | Hoàn thiện, kiểm tra xuất/hoàn tác, tài liệu và quyết định mở rộng | Demo 3 luồng; ngân sách thực tế; backlog; quyết định go/no-go | Kết quả pilot | 5 |

Tổng 40 ngày công kỹ sư. Chủ sản phẩm khoảng 4 ngày, QA/design tổng 6–10 ngày. Đây là kế hoạch một người nên công việc chính tuần tự; 8 tuần gồm thời gian sửa lỗi cuối kỳ, không phải 40 ngày tính năng cộng thêm QA. Nếu adapter hoặc renderer cần thêm >5 ngày so với dự tính, dùng phạm vi rút gọn hoặc kéo dài 1–2 tuần; thông báo tại mốc tuần 1/4.

## 5. Thiết kế nhận xét và chấm điểm

Rubric khởi đầu dưới đây cần hiệu chỉnh với người chấm, không xem điểm là dự đoán viral:

| Tiêu chí | Trọng số | Bằng chứng cần có |
| --- | ---: | --- |
| Hook và sự rõ ràng đầu video | 20% | Câu mở đầu và timestamp |
| Giá trị nội dung, mạch kể | 25% | Luận điểm, sự lặp hoặc thiếu ngữ cảnh |
| Nhịp dựng | 15% | Khoảng lặng, điểm nối, phân bố thời lượng |
| Âm thanh và khả năng nghe | 15% | Âm lượng/clipping từ phân tích; nhận xét nghe nếu thực sự có audio |
| Hình ảnh, chữ và khả năng đọc | 15% | Khung hình cụ thể, vị trí chữ, vùng an toàn |
| CTA và phù hợp định hướng/CreatorDNA | 10% | CTA và snapshot định hướng được chọn |

Mỗi tiêu chí 0–10; điểm tổng = tổng(điểm × trọng số) × 10, trên thang 100. Kết quả lưu rubric/model/input revision, mức tin cậy, khoảng thời gian, bằng chứng, mức ưu tiên, đề xuất thao tác và các tiêu chí chưa đánh giá được. Thiếu dữ liệu thì trả “chưa đủ dữ liệu”; chỉ hiển thị điểm tổng tạm tính chuẩn hóa trên các trọng số đã đánh giá và ghi rõ độ phủ, không quy thiếu bằng chứng thành 0 điểm.

Hai cấp đánh giá: nhanh dùng transcript + metadata cho nội dung; đầy đủ thêm hình/âm thanh cho chất lượng dựng. Không để cấp nhanh khẳng định vấn đề hình/âm thanh chưa quan sát. Khi edit đổi timing, map nhận xét qua timeline mới hoặc đánh dấu cũ và đánh giá lại. Điểm trước/sau phải dùng cùng rubric, model/cấu hình và đúng bản video.

Bộ hiệu chỉnh: 30 video đa dạng, hai người chấm độc lập, xử lý bất đồng để tạo tham chiếu; 20 video hiệu chỉnh và 10 video giữ riêng. Mục tiêu pilot: sai lệch trung bình điểm tổng ≤10/100 trên tập giữ riêng; ≥80% nhận xét được người chấm xác nhận có bằng chứng; ≥70% đề xuất được người dùng đánh giá hữu ích. Nếu không đạt, phát hành nhận xét có bằng chứng trước và tiếp tục hiệu chỉnh điểm.

## 6. Chuẩn bị thành skill cho Agent từ đầu

UI và Agent gọi cùng application service; Agent không điều khiển editor bằng thao tác chuột. Timeline có `schemaVersion`, `projectId`, `baseRevision`, danh sách track/clip/text/effect, asset/font ID, thời gian theo frame hoặc timebase cố định và nguồn thao tác. Map thời gian clip nguồn → Smart Cut → timeline thành phẩm để tránh đặt chữ/hiệu ứng sai vị trí.

| Skill dự kiến | Quyền | Kết quả |
| --- | --- | --- |
| `video.get_project` | Đọc | Asset, transcript, phiên bản, preset và năng lực editor |
| `video.review` | Đọc + tạo job/kết quả | Review gắn đúng phiên bản và dự toán chi phí |
| `video.propose_edits` | Tạo đề xuất | Danh sách thay đổi có lý do và timestamp |
| `video.apply_edit_draft` | Ghi nháp | Phiên bản mới từ patch hợp lệ; giữ bản trước và chỉnh tay không liên quan |
| `video.preview` | Tạo output nháp | Preview cho đúng revision, có giới hạn tài nguyên |
| `video.render` | Xuất theo xác nhận | Tiếp tục ranh giới xác nhận render hiện có trong Video Studio |

Tuần 1 thiết kế contract, tuần 2–5 dùng qua UI, tuần 6 mới đưa vào registry Agent hiện có. Mỗi skill có schema input/output, ownership, optimistic concurrency, idempotency, log chi phí/trạng thái và capability discovery. Không cho Agent chạy mã hiệu ứng tùy ý hoặc shell do model tạo.

Chủ động có kiểm soát: người dùng bật “tự review khi có bản nháp mới”, chọn preset và trần chi phí. Agent phát hiện bản mới, review, tạo nháp edit và preview nếu có quyền; chỉ thông báo khi có đề xuất đáng xem hoặc lỗi. Không tự duyệt bản cuối, ghi đè nguồn hay xuất/đăng ngoài quyền đã cấp. Tối đa hai vòng review–edit cho mỗi phiên bản, dừng khi không cải thiện hoặc chạm ngân sách; không tối ưu điểm bằng cách làm sai ý người dùng.

Ví dụ: “Nhận xét video này, làm nhịp nhanh hơn, thêm chữ màu vàng ở 3 ý chính theo font thương hiệu, giữ nguyên câu kết.” Agent trả bản nháp với diff và preview để người dùng sửa hoặc duyệt. Nếu người dùng đổi timeline trong lúc Agent chạy, trả xung đột thay vì ghi đè.

## 7. Dự tính chi phí thử nghiệm 8 tuần

Đơn vị USD và VND; **26.000 VND/USD là tỷ giá quy ước lập ngân sách**, không phải tỷ giá giao dịch. Các khoản hạ tầng là giả định hạn mức, chưa gắn báo giá cấu hình cụ thể. Không dựa vào free tier để bảo đảm pilot hoạt động.

### Quy mô và công thức đo

- 100 video × 90 giây = 150 phút thành phẩm; mỗi video 3 lượt review, 2 lượt preview, 2 lượt export. Lượt đánh giá trước/sau được tính trong 3 lượt review.
- Bộ hiệu chỉnh nằm trong 100 video; một lượt lặp thêm trên 30 video đã có khoảng dự phòng AI.
- Giả định AI: 300 lượt × 40.000 input token + 4.000 output token/lượt = 12 triệu input + 1,2 triệu output. Đây là ước lượng quy đổi đầu vào đa phương thức, phải đo usage thật trong tuần 2; audio có thể có đơn giá khác.
- Ví dụ chỉ để tham chiếu với Gemini 2.5 Flash-Lite: input text/image/video $0,10 và output $0,40 mỗi triệu token → $1,68 cho cấu hình giả định trên, trước audio, retry và lượt đối chiếu model khác. Không dùng con số này làm ngân sách toàn bộ AI. Model hiện tại của dự án cần đối chiếu bảng giá riêng khi chạy.
- [Bảng giá Gemini chính thức](https://ai.google.dev/gemini-api/docs/pricing), kiểm tra 01/10/2026. Không gồm sinh video bằng Veo, TTS, grounding hay fine-tuning.
- Render: giả định mỗi preview 2 phút và export 5 phút → 100 × (2×2 + 2×5) = 1.400 phút worker = 23,3 giờ; cộng 30% retry thành 30,3 giờ. Nếu bình quân $0,20/giờ thì phần CPU dùng thực tế khoảng $6,07; khoản worker bên dưới lớn hơn vì dự phòng máy chạy thường trực. Không cộng CPU này lần nữa.
- Storage mục tiêu 100 GB, trần 200 GB; nguồn + proxy + bản xuất. Egress mục tiêu 100 GB; đo tải xuống/xem lại, dùng retention 30 ngày cho output thử nghiệm và chính sách riêng cho nguồn.

### Kịch bản cơ sở được đề xuất

| Khoản | Giả định / phạm vi | USD | VND |
| --- | --- | ---: | ---: |
| API + database | $20/tháng × 2, môi trường pilot | 40 | 1.040.000 |
| Worker render | $30/tháng × 2, gồm CPU dự phòng | 60 | 1.560.000 |
| Storage + egress | Hạn mức hai tháng; thay bằng giá provider sau benchmark | 20 | 520.000 |
| AI review + đề xuất | Hạn mức cho usage, audio, retry và A/B model | 30 | 780.000 |
| Logging/giám sát | Hạn mức hai tháng | 10 | 260.000 |
| Khuyến khích pilot | 20 người × 100.000 đồng | — | 2.000.000 |
| Tổng trước dự phòng | | | 6.160.000 |
| Dự phòng 25% | 6.160.000 × 25% | | 1.540.000 |
| Tổng chạy thử | | | **7.700.000** |
| Quỹ kiểm tra font/asset/license | Chỉ chi nếu cần; không bao gồm license editor thương mại | | 425.000 |
| Trần đề xuất | | | **8.125.000** |

Editor mã nguồn mở không đồng nghĩa không có công tích hợp. Kịch bản cơ sở giả định nền được chọn không thu phí bản quyền; nếu cần Company License/Starter của OpenVideo hoặc Remotion, lấy giá thật và cập nhật ngân sách tại tuần 1 trước khi cam kết lựa chọn đó.

| Kịch bản | Quy mô | Trần chạy thử dự kiến | Cách sử dụng |
| --- | --- | ---: | --- |
| Tiết kiệm | 10 người, 30 video, worker theo nhu cầu | 3–4 triệu đồng | Kiểm chứng editor/review trước pilot rộng |
| Cơ sở | 20 người, 100 video, theo bảng trên | 8,125 triệu đồng | Đủ so sánh trước/sau và kiểm thử Agent |
| Mở rộng | 50 người, 300 video, nhiều lượt export/QA | 15–20 triệu đồng | Chỉ mở sau khi có chi phí đo thực tế; chưa gồm license |

### Công phát triển — tách khỏi tiền chạy thử

Giả định để tính ngân sách, không phải báo giá thị trường: kỹ sư 2.000.000 đồng/ngày; QA/design 1.000.000 đồng/ngày. 40 ngày kỹ sư = 80 triệu; QA/design 6–10 ngày = 6–10 triệu. Tổng công trước dự phòng = 86–90 triệu đồng. Cộng dự phòng tối đa 25% cho mức công cao nhất = 22,5 triệu đồng; khoảng ngân sách công dự kiến **86–112,5 triệu đồng**. Chủ sản phẩm 4 ngày chưa quy tiền; nếu thuê ngoài cần bổ sung riêng.

Cộng trần chạy thử 8,125 triệu đồng, tổng dự kiến **94,125–120,625 triệu đồng**. Chốt số ngày QA/design và mức dự phòng tại tuần 1.
Nếu đội nội bộ đã có nhân sự, khoản công là chi phí nguồn lực, không nhất thiết là tiền chi mới. Chi phí chạy thử trực tiếp vẫn giữ trần 8,125 triệu.

### Theo dõi và giới hạn ngân sách

Ghi usage và chi phí theo project/job, model, phút nguồn và phút xuất; phân biệt chi phí cố định với chi phí biên mỗi video. AI mặc định tối đa 3 lượt/video trong pilot; export tối đa 2 lượt trong dự toán, lượt thêm phải được tính lại. Cảnh báo ở 70%, dừng job tự động mới ở 90% trần AI/render; người dùng vẫn đọc và sửa bản nháp đã có. Báo cáo tuần 2, 4, 7; nếu dự báo vượt 8,125 triệu thì giảm số video/lượt chạy hoặc lập phương án ngân sách cập nhật.

## 8. Tiêu chí hoàn thành và quyết định tiếp tục

- Người dùng hoàn thành ba luồng: review rồi sửa tay; tự thêm chữ/hiệu ứng; nhận bản nháp Agent rồi chỉnh/duyệt.
- ≥95% job export thành công sau tối đa một retry trong pilot; kiểm tra playback, duration, âm thanh và style trên ít nhất 30 bản xuất.
- Font Việt không mất dấu, chữ không tràn vùng an toàn; lệch timestamp chữ so với timeline ≤100 ms trên bộ mẫu. Không mất bản sửa khi lưu/mở lại.
- Tất cả hiệu ứng được công bố có bài so sánh preview–export; loại hiệu ứng chưa đạt thay vì cho xuất khác preview.
- Không có lỗi cách ly tài khoản hoặc ghi đè phiên bản; retry không tạo bản trùng; render giữ ranh giới xác nhận hiện có.
- ≥70% người thử hoàn tất thêm chữ + hiệu ứng + xuất mà không cần hỗ trợ; trung vị thời gian hoàn thành ≤10 phút với clip 90 giây đã có transcript/Smart Cut.
- Review đạt tiêu chí mục 5; pilot có usage thực tế và dự báo chi phí khi tăng lên 1.000 video/tháng.

Nếu đạt: mở beta và mở rộng thư viện preset/skill. Nếu review chưa đạt nhưng editor ổn: phát hành editor + nhận xét, tiếp tục hiệu chỉnh điểm. Nếu tích hợp editor không đạt: giữ đầu ra FFmpeg giới hạn, tránh kéo dài vô hạn hoặc xây editor đầy đủ từ đầu trong cùng ngân sách.

## 9. Việc bắt đầu ngay tuần 1

1. Xác nhận baseline end-to-end và chốt 100 video pilot có quyền sử dụng.
2. Chuẩn bị 30 video chấm tham chiếu, rubric và tiêu chí bằng chứng.
3. Chạy PoC OpenCut Classic, ghi commit/license và đo công tích hợp.
4. Chốt timeline contract, font registry, preset và adapter preview/export.
5. Chốt cấu hình pilot, số ngày QA/design và thay giả định chi phí bằng benchmark/báo giá trước khi mua dịch vụ.

Tài liệu này là kế hoạch; chưa cài editor, mua license hoặc thay đổi ứng dụng.

## 10. Phần bổ sung — Storyboard trực quan bằng hình ảnh và text

Tiến độ triển khai và phạm vi từng slice được theo dõi tại [STORYBOARD_SLICES.md](./STORYBOARD_SLICES.md). Slice 1 triển khai board thủ công; các ước lượng đầy đủ dưới đây gồm cả các slice chưa làm.

### Vị trí trong sản phẩm

Nâng storyboard text hiện có trong Kịch bản thành một tab **Storyboard**, cạnh tab **Lời thoại**. Sau khi hook/nội dung/CTA tương đối ổn, người dùng chọn “Chia cảnh” rồi thêm ảnh minh họa. Không yêu cầu tạo ảnh mới được quay video. Trong sidebar vẫn dùng mục Kịch bản; một kịch bản là ngữ cảnh của storyboard.

Luồng đề xuất: Kế hoạch nội dung → Kịch bản/Lời thoại → Storyboard → Quay hoặc upload → Smart Cut → Chỉnh sửa → Nhận xét và xuất. Review có thể chạy ở các bản nháp hoặc bản xuất; vị trí này chỉ mô tả nơi storyboard hỗ trợ chuẩn bị quay. Storyboard là kế hoạch cảnh; timeline editor là bản dựng với clip và thời gian thực tế.

Video Studio có panel “Cảnh dự kiến” dùng lại storyboard được chọn, cho phép gắn clip/đoạn clip vào scene ID, theo dõi cảnh đã quay và mở nhanh cảnh tương ứng. Khi tạo project, ghim script/storyboard revision; có bản storyboard mới thì hiển thị cập nhật và cho chọn nhập thay đổi, không âm thầm thay bản dựng.

### Giao diện và chức năng đầu tiên

- Board gồm các thẻ cảnh có ảnh theo aspect ratio kịch bản, số cảnh và thời lượng; kéo thả đổi thứ tự.
- Chọn một thẻ để mở panel: mô tả hình ảnh, lời thoại/voice-over, góc quay, B-roll, text trên màn hình, font/màu/vị trí và chuyển cảnh dự kiến. Dùng lại các trường đã có như visual, dialogue, direction, broll, transition và durationSeconds.
- Nút “Tải ảnh”, “Tạo ảnh minh họa”, “Tạo lại cảnh này”, “Khóa cảnh” và “Dùng làm ảnh tham chiếu”. Ảnh AI được ghi là minh họa, không tự trở thành clip thành phẩm.
- Chế độ xem nhanh chạy từng ảnh theo thời lượng cảnh, kèm text; chưa cần render animatic MP4 hoặc đồng bộ giọng đọc ở MVP này.
- Text overlay là lớp riêng có thể sửa; không yêu cầu AI vẽ sẵn chữ lên ảnh. Lời thoại và ghi chú chỉ là thông tin dưới thẻ, không tự chèn lên video.
- Hai chế độ đầu ra rõ ràng: “Tham chiếu để quay” và “Dùng ảnh trong video”. Chỉ chế độ thứ hai, khi được chọn, mới tạo image clip trên timeline dựng.

MVP giữ giới hạn tối đa 16 cảnh hiện có; mặc định 6–8 cảnh cho video ngắn. Một cảnh dùng một keyframe được chọn và có thể giữ lịch sử các ảnh thay thế. Đổi font/màu/text không gọi lại model tạo ảnh. Chỉ sinh ảnh cho cảnh được chọn, không mặc định tạo mọi biến thể.

### Cấu trúc triển khai

Tận dụng `ScriptStoryboardFrameDto` hiện có và giữ scene ID ổn định khi cập nhật. Bổ sung kiểu dữ liệu overlay riêng cho text/font/color/position/time, liên kết minh họa bằng asset ID và trạng thái cảnh khóa. Đầu tiên bổ sung trường tùy chọn có default để kịch bản cũ vẫn mở được; parser/DTO cần cập nhật cùng nhau vì parser hiện chỉ trả các trường đã khai báo.

Metadata ảnh và các lượt tạo đặt ở bảng media/job riêng: asset ID, chủ sở hữu, scene ID, script revision, mô tả cảnh tại lúc yêu cầu, model/prompt, ảnh tham chiếu, style, trạng thái và chi phí. Blob lưu bucket private; không lưu base64 ảnh trong script JSON và không lưu signed URL làm định danh lâu dài. Kết quả job trả muộn sau khi cảnh đã đổi vẫn có thể lưu như biến thể cũ nhưng không tự thay ảnh đang chọn.

Nên tách mã xử lý board khỏi component ScriptEditor hiện lớn, dùng StoryboardBoard/SceneCard/SceneInspector và một application service chung. Dùng worker và cơ chế job hiện có cho sinh ảnh; thêm adapter `image-generation` bên cạnh adapter text. Không buộc storyboard phụ thuộc API của editor bên thứ ba. Adapter editor chỉ chuyển scene/overlay đã chọn sang draft timeline ở bước dựng.

Gemini có API sinh/chỉnh ảnh với đầu vào ảnh tham chiếu; có thể thử do dự án đã dùng hệ sinh thái Gemini, nhưng phải kiểm tra riêng model, quyền truy cập, chi phí và chất lượng. Xem [tài liệu chính thức](https://ai.google.dev/gemini-api/docs/image-generation). Có chung key không có nghĩa mọi model ảnh đã được bật hoặc có cùng bảng giá. Dùng một style chung và ảnh tham chiếu nhân vật/sản phẩm để giảm khác biệt giữa cảnh; vẫn cần người dùng kiểm tra tính nhất quán.

### Skill Agent

Đọc/chia cảnh text có thể phát triển tiếp từ `script.get_current` và `script.update_draft` hiện có. Đối với ảnh và bản dựng, tách các hành động rõ ràng:

| Skill đề xuất | Đầu ra / giới hạn |
| --- | --- |
| `storyboard.get` | Đọc board, revision, ảnh được chọn và trạng thái cảnh |
| `storyboard.generate_draft` | Chia lời thoại thành cảnh hoặc chỉnh cảnh; giữ các cảnh đã khóa |
| `storyboard.illustrate_scene` | Tạo ảnh nháp của đúng cảnh/revision, theo style và trần chi phí |
| `storyboard.update_scene` | Sửa text/overlay/ảnh được chọn bằng version check; không ghi đè phần không yêu cầu |
| `storyboard.create_edit_draft` | Chuyển các cảnh/asset/overlay được chọn thành timeline nháp; không tự xác nhận xuất |

Nếu người dùng bật chủ động, Agent có thể đề xuất storyboard sau khi lời thoại sẵn sàng và tạo ảnh trong hạn mức đã cấp. Không tự tạo lại cảnh khóa, thay hình người dùng tải lên hoặc chèn mọi ảnh minh họa vào video. Ví dụ: “Chia kịch bản này thành 6 cảnh, minh họa cùng một phong cách, thêm tiêu đề màu vàng ở cảnh 2 và 5, giữ nguyên ảnh cảnh 1.”

### Timeline và chi phí tăng thêm

Đây là phạm vi bổ sung, **chưa nằm trong ngân sách/timeline 8 tuần ở trên**. Ước lượng dựa trên việc dùng lại storyboard text và hạ tầng media đã có:

| Phần | Thời gian kỹ sư dự kiến | Nghiệm thu |
| --- | ---: | --- |
| Board ảnh + upload + overlay text + lưu phiên bản | 5 ngày | Dữ liệu cũ mở được, font Việt đúng, khóa/reorder/save không mất ảnh |
| Sinh ảnh theo cảnh + skill + nối tham chiếu vào Video Studio | 5 ngày | Có progress/retry/cost, job cũ không ghi đè cảnh mới, clip gắn đúng scene |

Nếu chỉ một kỹ sư, chèn hai tuần này sau tuần 1, trước phần review/editor; kế hoạch tổng thành **10 tuần, kết thúc dự kiến 11/12/2026**. Việc chọn editor vẫn ở tuần 1. Nếu ưu tiên review trước, có thể làm storyboard sau pilot thay vì chuyển mọi mốc. Không coi 10 ngày là cam kết nếu baseline asset/job cần thay đổi đáng kể.

Pilot bổ sung: 100 storyboard × 6 ảnh × 1,5 lượt tạo tính cả tạo lại = 900 ảnh. Chi phí ảnh = 900 × giá thực tế mỗi ảnh. Minh họa với đơn giá giả định $0,03–0,08/ảnh (không phải báo giá model): $27–72, khoảng 702.000–1.872.000 đồng; cộng khoảng 300.000 đồng dự phòng storage/job → hạn mức bổ sung khoảng **1–2,2 triệu đồng**. Thay đơn giá bằng model/resolution được chọn trước khi mở tạo ảnh. Giảm chi phí bằng upload và chỉ tạo 1–2 cảnh quan trọng.

Công bổ sung theo đơn giá mục 7: 10 ngày kỹ sư = 20 triệu; QA/design 2–3 ngày = 2–3 triệu; cộng 25% dự phòng = **27,5–28,75 triệu đồng**. Tổng tăng thêm cả chạy thử khoảng **28,5–30,95 triệu đồng**. Tổng ngân sách kế hoạch mở rộng tương ứng khoảng **122,625–151,575 triệu đồng**, chưa quy tiền công chủ sản phẩm bổ sung. Các mốc và số tiền này là phương án để chọn, chưa thay thế kế hoạch cơ sở.

### Cập nhật demo miễn phí ngày 05/10/2026

Slice 1 và phần text-to-image của slice 2 đã có trong mã nguồn. Thử nghiệm ảnh dùng Cloudflare Workers AI / FLUX.1 Schnell, giữ tài khoản **Workers Free** và hạn mức miễn phí hiện tại 10.000 neurons/ngày. Chi phí inference của demo trong quota Free là **0 đồng**; local PostgreSQL/MinIO dùng hạ tầng phát triển đã có, không tạo thêm dịch vụ cloud trả phí. Đây chưa phải cam kết đủ quota cho pilot 900 ảnh hoặc ngân sách trả phí bên trên. Công phát triển và vận hành vẫn tính riêng. [Hạn mức Cloudflare](https://developers.cloudflare.com/workers-ai/platform/pricing/).

Ứng dụng mặc định giới hạn 20 yêu cầu/người/ngày và 50 yêu cầu dùng chung/ngày, không tự retry hoặc fallback trả phí. Xem [hướng dẫn cấu hình](STORYBOARD_IMAGE_SETUP.md). Đã kiểm thử với database/storage thật và ảnh fixture; gọi tạo ảnh Cloudflare thật cần Account ID/API Token. Ảnh tham chiếu/đồng nhất nhân vật, skill Agent và liên kết timeline vẫn ở các bước tiếp theo; không coi toàn bộ phạm vi 10 ngày ở trên là đã hoàn thành.

