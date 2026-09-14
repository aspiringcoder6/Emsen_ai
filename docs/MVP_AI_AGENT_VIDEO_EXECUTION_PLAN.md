# KẾ HOẠCH TRIỂN KHAI MVP — AI AGENT ĐIỀU PHỐI VÀ AI VIDEO

**Dự án:** CreatorFlowAI / emsen  
**Ngày lập:** 14/09/2026  
**Thời gian đề xuất:** 15 ngày làm việc, từ 14/09/2026 đến 02/10/2026  
**Ngày đệm và bàn giao:** 05–06/10/2026  
**Chiến lược:** Agent-first, sau đó tích hợp vertical slice AI Video vào cùng hệ thống skill  
**Mức độ:** MVP nội bộ, ưu tiên chạy được trọn luồng và kiểm soát được rủi ro

---

## 1. Tóm tắt điều hành

Khuyến nghị triển khai theo phương án **kết hợp có thứ tự**:

1. Ưu tiên xây AI Agent chatbot tổng thành lớp điều phối duy nhất cho những chức năng đã có: Creator DNA, Định hướng, Kế hoạch nội dung và Kịch bản.
2. Mọi hành động của Agent đi qua một bộ **skill có schema, phân quyền, xác nhận và audit log**; Agent không truy cập hoặc sửa database trực tiếp.
3. Trong tuần 2, dựng sẵn hợp đồng `media job` và trạng thái xử lý để AI Video có thể cắm vào cùng kiến trúc.
4. Tuần 3 chỉ làm một vertical slice video đủ cho MVP: tải video dọc, chuyển lời nói thành chữ, gợi ý cắt khoảng lặng, áp một preset caption/brand, render và tải MP4.
5. Video cũng được điều khiển qua Agent, ví dụ: “Dùng kịch bản này, tạo project dựng video, cắt khoảng lặng và dùng preset của tôi”.

Phương án này tận dụng tối đa phần đã có và tránh xây riêng một chatbot cùng một video editor không liên kết với nhau.

### Kết quả cam kết cuối kỳ

- Người dùng có thể dùng hội thoại để xem, tạo và chỉnh các tài sản nội dung trong hệ thống.
- Các thao tác thay đổi dữ liệu đều có bản xem trước hoặc bước xác nhận phù hợp.
- Agent hiểu đúng tài khoản, Creator DNA, kế hoạch và kịch bản đang được nhắc tới.
- Một video mẫu có thể đi từ upload → transcript → đề xuất cắt → caption/preset → render → tải xuống.
- Agent xem được trạng thái video job và kích hoạt các bước được cho phép.
- Có bộ tài liệu đủ để demo, UAT, báo cáo tiến độ và bàn giao vận hành.

---

## 2. Hiện trạng có thể tận dụng

### Đã có

- Web React/Tailwind và API Express.
- Đăng ký bằng số điện thoại, đăng nhập và session cookie `HttpOnly`.
- Creator DNA, onboarding và tín hiệu học dần từ trò chuyện.
- Chat Emsen và cơ chế gọi Gemini có structured output.
- Master Direction có tạo, chỉnh sửa, lưu nháp, chốt và lịch sử phiên bản.
- Nhiều Content Plan/timeline, lịch quay, mục tiêu video và liên kết ổn định với kịch bản.
- Kịch bản gồm hook, nội dung, CTA, storyboard text, trợ lý sửa từng phần và xuất TXT/JSON.
- PostgreSQL migration, Redis và MinIO đã có cấu hình khung cho local.
- Lớp AI provider adapter giúp thay model mà không thay toàn bộ business logic.

### Chưa có hoặc mới là khung

> Phần dưới đây mô tả baseline tại thời điểm lập kế hoạch. Tiến độ triển khai mới nhất được ghi ngay sau mục này.

- Chat hiện chưa phải Agent có khả năng chọn và gọi skill nghiệp vụ.
- Chưa có skill registry, policy xác nhận, idempotency và audit log cho Agent.
- Chưa có media project, upload an toàn, signed URL và chính sách vòng đời file.
- Worker chưa đăng ký queue processor thực tế.
- Chưa có transcription, edit-decision list, FFmpeg pipeline, caption preset và render job.
- Chưa có bộ đánh giá riêng cho hành vi Agent và chất lượng video.

### Cập nhật triển khai ngày 14/09/2026

- Đã tạo skill registry dùng chung với metadata về input/output schema, quyền đọc/ghi và chính sách xác nhận.
- Đã chuyển việc chọn câu hỏi chủ động và ghi tín hiệu chat vào Creator DNA thành hai skill độc lập.
- Đã thêm ba skill Định hướng: đọc phiên bản hiện tại, tạo bản nháp và cập nhật toàn bộ hoặc từng phần bằng bản nháp mới.
- Chat đã có structured skill call và lớp nhận diện tiếng Việt dự phòng; câu hỏi giả định không được phép kích hoạt skill ghi.
- Mỗi lần chạy skill được lưu cùng tin nhắn chat; giao diện hiển thị kết quả thao tác Định hướng và tự làm mới trang Định hướng khi an toàn.
- Đã thêm migration 12, unit test cho intent/registry và integration test cho luồng Creator DNA → chat → Định hướng.
- Chưa triển khai confirmation token, idempotency tổng quát, context builder cho Plan/Script và audit table độc lập; đây là phần tiếp theo của Milestone A.

### Kết luận về khả năng thực hiện

Mốc 3 tuần khả thi vì phần nghiệp vụ nội dung đã tồn tại. Tuy nhiên, mốc này chỉ thực tế khi giữ video ở mức vertical slice và không mở rộng thành timeline editor nhiều track.

---

## 3. Phạm vi MVP được đề xuất

### 3.1. P0 — AI Agent chatbot tổng

Agent cần làm được các nhóm việc sau:

#### Hiểu và tra cứu

- Xem Creator DNA hiện tại và chỉ ra phần còn thiếu.
- Xem định hướng đã chốt và các phiên bản gần đây.
- Liệt kê kế hoạch nội dung, timeline và nội dung đã lên lịch.
- Liệt kê, tìm và mở đúng kịch bản.
- Xem trạng thái media/video job.

#### Tạo và chỉnh sửa

- Gợi ý hoặc tạo bản nháp Định hướng.
- Tạo kế hoạch nội dung theo ngày rảnh và mục tiêu tuần.
- Tạo kịch bản từ đúng kế hoạch và đúng nội dung đã chọn.
- Chỉnh hook, nội dung, CTA hoặc storyboard theo yêu cầu.
- Cập nhật thuộc tính kịch bản qua bản xem trước.
- Xuất kịch bản theo định dạng đang hỗ trợ.

#### Điều phối nhiều bước

Agent hỗ trợ các yêu cầu như:

> “Tuần này tôi chỉ rảnh thứ Bảy, hãy lên kế hoạch ba video, chọn ý tưởng dễ quay nhất và tạo bản nháp kịch bản cho tôi.”

Luồng thực hiện phải được chia thành các bước rõ ràng, hiển thị đối tượng được chọn và xin xác nhận trước khi ghi nhiều thay đổi.

#### Những việc Agent không được tự làm

- Không xóa dữ liệu nếu chưa có xác nhận rõ ràng.
- Không tự chốt Định hướng hoặc Kế hoạch nếu người dùng chỉ yêu cầu gợi ý.
- Không render video có chi phí nếu người dùng chưa duyệt edit decision/preset.
- Không tự sửa Creator DNA lâu dài chỉ từ một suy đoán. Thông tin học được phải là đề xuất có nguồn và có thể hoàn tác.
- Không gọi skill ngoài danh sách cho phép và không truy cập database trực tiếp.

### 3.2. P1 — AI Video vertical slice

#### Có trong MVP

- Video dọc 9:16.
- Thành phẩm 30–180 giây.
- 1–10 clip đầu vào, tối đa 15 phút hoặc 2 GB cho một project.
- Một người nói chính.
- Upload trực tiếp bằng URL có thời hạn.
- Transcription tiếng Việt và màn hình sửa transcript.
- Phát hiện khoảng lặng/từ đệm và tạo danh sách đoạn đề xuất giữ/cắt.
- Người dùng bật/tắt từng đề xuất trước khi render.
- Một đến hai preset caption cố định.
- Chèn logo, màu/font cơ bản, nhạc nền cố định và chuẩn hóa âm lượng.
- Render MP4 H.264/AAC, theo dõi trạng thái và tải file bằng URL có thời hạn.
- Agent có skill tạo project, bắt đầu xử lý, xem trạng thái và render sau khi xác nhận.

#### Không có trong MVP

- Timeline nhiều track kiểu CapCut.
- Sinh video generative hoặc tự sinh B-roll/hình minh họa.
- Auto crop video ngang.
- Tự chọn stock footage hoặc nhạc thương mại.
- Voice cloning, lip-sync hoặc camera processing.
- Đăng tự động lên mạng xã hội.
- Phân tích trend thời gian thực hoặc dự đoán viral.
- Billing/subscription và phân quyền workspace phức tạp.

Nếu tiến độ bị trễ, thứ tự cắt giảm là: nhạc nền → từ điển từ đệm nâng cao → preset thứ hai. Không cắt upload an toàn, transcript có thể sửa, duyệt đoạn cắt, job status hoặc quyền truy cập file.

---

## 4. Kiến trúc mục tiêu cho MVP

```text
Người dùng
    |
Chat Emsen / màn hình nghiệp vụ
    |
Agent Orchestrator
    |-- Context Builder: user + Creator DNA + đối tượng đang chọn
    |-- Planner giới hạn bước
    |-- Policy & Confirmation Gate
    |-- Skill Registry + schema validation
    |-- Audit / trace / cost
    |
    +--> Content skills --> application services hiện có --> PostgreSQL
    |
    +--> Video skills --> media service --> Redis queue --> Worker/FFmpeg
                                      |                    |
                                      +--> object storage <-+
```

### Nguyên tắc kỹ thuật bắt buộc

1. **Skill gọi application service, không gọi SQL trực tiếp.** Quy tắc auth, ownership, version conflict và validation hiện có phải tiếp tục được dùng.
2. **Structured input/output.** Mỗi skill có JSON schema và kết quả máy có thể đọc được.
3. **Tách read và write.** Skill chỉ đọc có thể chạy ngay; skill thay đổi dữ liệu cần preview hoặc confirmation theo mức rủi ro.
4. **Idempotency.** Tạo kế hoạch, kịch bản, upload và render phải nhận `idempotencyKey` để retry không tạo bản trùng.
5. **Giới hạn vòng lặp.** Một yêu cầu tối đa 6 lần gọi skill trong MVP; Agent dừng và hỏi lại nếu thiếu lựa chọn quan trọng.
6. **Grounding.** Mọi câu trả lời về dữ liệu hệ thống phải kèm ID/tên đối tượng từ kết quả skill, không dựa vào suy đoán của model.
7. **Job bất đồng bộ.** Upload, transcription và render không chạy trong HTTP request dài; API chỉ tạo job và trả trạng thái.
8. **Tệp không public.** Upload/download dùng URL có thời hạn; worker mới được đọc file gốc.
9. **Có thể thay model.** Giữ provider adapter hiện tại; MVP dùng provider đang hoạt động thay vì chuyển sang model local trong cùng sprint.

---

## 5. Danh mục skill ưu tiên

| Nhóm | Skill MVP | Tác dụng | Mức xác nhận |
|---|---|---|---|
| Context | `creator.get_profile` | Đọc Creator DNA và phần còn thiếu | Không |
| Context | `direction.get_current` | Đọc định hướng đã chốt | Không |
| Content Plan | `content_plan.list` / `content_plan.get` | Chọn đúng kế hoạch và timeline | Không |
| Content Plan | `content_plan.generate_preview` | Sinh đề xuất chưa ghi dữ liệu | Không |
| Content Plan | `content_plan.save_draft` | Lưu bản nháp | Xác nhận gộp nếu nhiều thay đổi |
| Content Plan | `content_plan.approve` | Chốt và kích hoạt đồng bộ kịch bản | Bắt buộc |
| Script | `script.list` / `script.get` | Tìm đúng kịch bản | Không |
| Script | `script.create_preview` | Chuẩn bị kịch bản từ lịch/ghi chú | Không |
| Script | `script.create` / `script.update` | Tạo hoặc cập nhật kịch bản | Xác nhận nếu ghi nhiều trường |
| Script | `script.assist_section` | Sửa riêng hook/body/CTA/storyboard | Hiển thị diff trước khi áp dụng |
| Script | `script.export` | Xuất TXT/JSON | Không |
| Script | `script.delete` | Xóa kịch bản | Bắt buộc, nêu đúng tên |
| Media | `media.create_project` | Tạo video project gắn với kịch bản | Một lần |
| Media | `media.create_upload` | Cấp URL upload có thời hạn | Không |
| Video | `video.transcribe` | Tạo transcription job | Xác nhận chi phí nhẹ |
| Video | `video.suggest_cuts` | Tạo edit-decision list | Không ghi đè quyết định người dùng |
| Video | `video.update_decisions` | Lưu đoạn giữ/cắt | Xác nhận gộp |
| Video | `video.render` | Tạo render job | Bắt buộc |
| Video | `video.get_status` | Đọc tiến độ/lỗi | Không |
| Video | `video.get_download_url` | Cấp URL tải thành phẩm | Không |

### Trường tối thiểu trong đặc tả mỗi skill

- Tên và mô tả rõ khi nào nên/không nên gọi.
- JSON input schema và output schema.
- Quyền cần thiết và cách kiểm tra ownership.
- `readOnly`, `sideEffects`, `confirmationPolicy` và `costClass`.
- Idempotency key và version/revision của đối tượng.
- Timeout, số lần retry và lỗi có thể retry.
- Audit fields: user, conversation, skill, object, before/after, thời điểm và kết quả.
- Một ví dụ đúng, một ví dụ không nên gọi và một tình huống thiếu dữ liệu cần hỏi lại.

---

## 6. Timeline triển khai gấp — 15 ngày làm việc

| Giai đoạn | Agent & content skills | Media/AI Video | QA, tài liệu, vận hành |
|---|---:|---:|---:|
| Tuần 1 | 80% | 0% | 20% |
| Tuần 2 | 60% | 25% | 15% |
| Tuần 3 | 20% | 65% | 15% |

Đây là tỷ lệ ưu tiên công việc, không yêu cầu ba nhóm nhân sự riêng. Với một người phát triển, các đầu việc được thực hiện nối tiếp theo bảng ngày bên dưới.

### Tuần 1 — Nền Agent và skill đọc/ghi an toàn (14–18/09)

| Ngày | Trọng tâm | Công việc chính | Đầu ra để duyệt |
|---|---|---|---|
| 1 — 14/09 | Chốt phạm vi | Chốt 10 use case P0, ngoài phạm vi, dữ liệu test, tiêu chí Agent và video | Scope baseline + danh sách test prompt |
| 2 — 15/09 | Hợp đồng skill | Skill registry, schema chung, result/error envelope, confirmation và idempotency | Skill contract v1 + sơ đồ sequence |
| 3 — 16/09 | Agent read-only | Context builder và skill đọc Creator DNA, Direction, Plan, Script | Chat trả lời đúng dữ liệu tài khoản |
| 4 — 17/09 | Agent write preview | Preview/diff và skill tạo/sửa Plan/Script; không ghi khi chưa đủ dữ liệu | Demo tạo kế hoạch và kịch bản từ chat |
| 5 — 18/09 | Policy và audit | Confirmation gate, giới hạn bước, audit log, lỗi thân thiện, UI hiển thị tiến trình skill | **Milestone A: Agent điều khiển được luồng nội dung cơ bản** |

#### Điều kiện duyệt Milestone A

- 8/10 prompt lõi chọn đúng skill và đúng đối tượng.
- Không có thao tác xóa/chốt nào chạy khi chưa xác nhận.
- Người dùng nhìn thấy Agent đang làm bước nào và có thể hủy trước mutation.
- Mỗi mutation có audit record và không tạo trùng khi retry.

### Tuần 2 — Hoàn thiện Agent end-to-end và dựng nền media (21–25/09)

| Ngày | Trọng tâm | Công việc chính | Đầu ra để duyệt |
|---|---|---|---|
| 6 — 21/09 | Multi-step workflow | Plan giới hạn bước; luồng DNA → Direction → Plan → Script | Một yêu cầu hội thoại hoàn thành nhiều bước có kiểm soát |
| 7 — 22/09 | Memory an toàn | Tách context phiên và Creator DNA lâu dài; đề xuất signal có nguồn/hoàn tác | Không tự “học” suy đoán thành dữ liệu thật |
| 8 — 23/09 | Agent hardening | Conflict handling, timeout, retry, cost/token trace và test prompt injection | Báo cáo eval Agent vòng 1 |
| 9 — 24/09 | Media foundation | Schema media project/asset/job; signed upload; queue; job state machine | Upload một clip và theo dõi job giả lập |
| 10 — 25/09 | Worker vertical skeleton | Worker nhận job, đọc asset, ghi log/progress, output artifact mẫu | **Milestone B: Agent ổn định + media job chạy end-to-end** |

#### Điều kiện duyệt Milestone B

- Agent hoàn thành ít nhất 9/10 kịch bản nghiệp vụ P0 trong môi trường test.
- 0 truy cập chéo dữ liệu giữa hai tài khoản thử nghiệm.
- Upload không đi qua bộ nhớ API và file không public.
- Job retry không tạo asset/output trùng.

### Tuần 3 — AI Video vertical slice và tích hợp vào Agent (28/09–02/10)

| Ngày | Trọng tâm | Công việc chính | Đầu ra để duyệt |
|---|---|---|---|
| 11 — 28/09 | Transcription | STT, timestamp theo segment, lưu transcript, UI sửa | Transcript của 3 video tiếng Việt có thể chỉnh |
| 12 — 29/09 | Smart Cut | Phát hiện khoảng lặng/từ đệm, EDL giữ/cắt, UI bật/tắt đề xuất | Người dùng duyệt được cut list trước render |
| 13 — 30/09 | Caption & brand | ASS caption, logo, font/màu, chuẩn hóa âm lượng; một preset chuẩn | Preview/render ngắn đúng nhận diện |
| 14 — 01/10 | Render & Agent skills | FFmpeg H.264/AAC, progress, retry, download URL; gắn skill video vào Agent | Chat tạo project, xem trạng thái và yêu cầu render |
| 15 — 02/10 | UAT và sửa P0 | Chạy bộ 10 video, test quyền truy cập, sửa lỗi chặn luồng, đóng tài liệu | **Milestone C: MVP candidate sẵn sàng bàn giao** |

### Ngày đệm — 05–06/10

- Chỉ sửa lỗi P0/P1 được xác nhận trong UAT.
- Kiểm tra migration/rollback, backup, biến môi trường và deployment worker.
- Demo cuối, hướng dẫn vận hành và ký biên bản nghiệm thu nội bộ.

### Giả định nguồn lực

Timeline trên giả định có:

- 01 người phát triển full-stack/AI làm toàn thời gian.
- 01 Product/Content Owner phản hồi trong ngày tại ba milestone.
- 02–03 Creator tham gia UAT, tối thiểu 10 bộ video mẫu.
- Có sẵn tài khoản AI/STT, object storage và worker environment.

Nếu chỉ có một người vừa phát triển vừa tự duyệt và chưa có dữ liệu video mẫu, cần cộng thêm 3–5 ngày làm việc.

---

## 7. Các gói công việc và ước lượng

| Gói | Nội dung | Ước lượng |
|---|---|---:|
| WP1 | Scope, use case và acceptance baseline | 1 ngày |
| WP2 | Agent runtime, context builder và planner giới hạn | 2 ngày |
| WP3 | Skill registry, content skills và confirmation | 3 ngày |
| WP4 | Audit, observability, security và Agent eval | 2 ngày |
| WP5 | Media schema, storage, queue và worker | 2 ngày |
| WP6 | Transcription, Smart Cut và review decision | 2 ngày |
| WP7 | Caption preset, FFmpeg render và download | 2 ngày |
| WP8 | Agent–video integration, UAT và bàn giao | 1 ngày |
| **Tổng** | Không tính ngày đệm | **15 ngày** |

---

## 8. Danh mục tài liệu chuyên môn cần có

### 8.1. Tài liệu P0 — phải có trước hoặc trong tuần 1

| Tài liệu | Nội dung tối thiểu | Mục đích báo cáo/nghiệm thu | Người duyệt |
|---|---|---|---|
| **MVP Scope & Acceptance** | In-scope, out-of-scope, 10 use case, chỉ số thành công | Ngăn scope creep và làm chuẩn nghiệm thu | Product Owner |
| **Agent Use-case & Conversation Flow** | Prompt mẫu, nhánh hỏi lại, preview, confirm, success/failure | Chứng minh trải nghiệm Agent có chủ đích | Product/Content Owner |
| **Agent Skill Catalog** | Tên skill, schema, quyền, side effect, lỗi, idempotency, ví dụ | Hợp đồng giữa LLM và hệ thống | Tech Lead |
| **Agent Policy & Confirmation Matrix** | Việc được tự làm, việc cần xác nhận, việc bị cấm | Kiểm soát hành động ngoài ý muốn | Product + Tech Lead |
| **Context & Memory Policy** | Context phiên, Creator DNA dài hạn, nguồn signal, sửa/xóa/hoàn tác | Tránh Agent học sai và bảo đảm minh bạch | Product + Security |
| **System Prompt / Prompt Registry** | Prompt có version, input boundary, output schema, model, changelog | Quản lý chất lượng và tái hiện lỗi | AI Owner |
| **Architecture & Sequence Diagram** | Chat → orchestrator → skill → service → DB/job | Báo cáo thiết kế và phân ranh trách nhiệm | Tech Lead |
| **Agent Evaluation Plan** | Golden prompts, expected skill calls, safety/adversarial cases | Đo tiến bộ bằng số thay vì cảm nhận | Product + QA |

### 8.2. Tài liệu P0 — phải có trước khi bắt đầu video

| Tài liệu | Nội dung tối thiểu | Mục đích |
|---|---|---|
| **Video MVP Specification** | Input limits, codec, kích thước, output, preset, cut rules | Chốt vertical slice video |
| **Media Data Model & Job State Machine** | Project, asset, transcript, edit decision, render; trạng thái và transition | Tránh job kẹt/không rõ nguồn dữ liệu |
| **Storage & Media Security Spec** | Signed URL, ownership, checksum, retention, xóa file, log truy cập | Bảo vệ video người dùng |
| **FFmpeg Pipeline Spec** | Lệnh/preset chuẩn, ASS, audio normalization, output probe | Render có thể tái hiện và kiểm thử |
| **Transcription & Smart Cut Rules** | Timestamp, confidence, silence threshold, filler dictionary, manual override | Định nghĩa “AI edit” trong MVP |
| **Brand Asset Specification** | Logo, font, màu, safe area, caption mẫu, quyền sử dụng nhạc | Nhận diện nhất quán và tránh thiếu asset |

### 8.3. Tài liệu P1 — phải hoàn tất trước UAT/bàn giao

| Tài liệu | Nội dung tối thiểu | Mục đích |
|---|---|---|
| **API/OpenAPI & Error Catalog** | Endpoint/skill mapping, auth, request/response, error code | Frontend/backend/Agent thống nhất |
| **Database & Migration Note** | Bảng mới, index, migration forward, backup và rollback | Triển khai an toàn |
| **Test Plan & Golden Dataset** | Unit/integration/E2E; 10 video, 30 prompt; expected outputs | Có bằng chứng chất lượng |
| **UAT Script & Sign-off** | Người thử, bước thử, expected result, severity, kết luận | Biên bản nghiệm thu rõ ràng |
| **Deployment & Operations Runbook** | Biến môi trường, service, worker, queue, storage, health check, rollback | Người khác vận hành được |
| **Observability & Incident Guide** | Trace ID, job ID, log redaction, dashboard, retry/dead-letter, xử lý sự cố | Điều tra lỗi nhanh |
| **Security & Privacy Checklist** | Session, tenant isolation, prompt injection, media access, secret handling | Điều kiện release |
| **Risk Register & Decision Log (ADR)** | Rủi ro, owner, trạng thái; quyết định model/storage/STT/queue | Báo cáo minh bạch và tránh tranh luận lại |
| **User Guide ngắn** | 5 luồng chính và lỗi thường gặp | Hỗ trợ demo, onboarding và bàn giao |

### Bộ tài liệu tối thiểu nếu cần rút gọn

Nếu thời gian cực gấp, không được bỏ sáu tài liệu sau:

1. MVP Scope & Acceptance.
2. Agent Skill Catalog.
3. Agent Policy & Confirmation Matrix.
4. Video MVP Specification.
5. Agent/Video Evaluation + UAT Plan.
6. Deployment & Operations Runbook.

Các tài liệu còn lại có thể gộp thành phụ lục kỹ thuật, nhưng nội dung cốt lõi vẫn phải tồn tại.

---

## 9. Tiêu chí nghiệm thu định lượng

### 9.1. AI Agent

- Tối thiểu 90% trong 30 prompt chuẩn chọn đúng skill hoặc hỏi lại đúng lúc.
- Tối thiểu 90% trong 10 luồng P0 hoàn thành không cần developer can thiệp.
- 0 thao tác xóa, chốt hoặc render chạy mà không có xác nhận bắt buộc.
- 100% mutation có user ID, conversation ID, skill call ID và audit result.
- Retry cùng idempotency key không tạo kế hoạch, kịch bản hoặc job trùng.
- 0 dữ liệu của user A xuất hiện trong phiên user B.
- P95 phản hồi cho skill đọc dưới 5 giây; luồng có LLM dưới 15 giây, không tính video job bất đồng bộ.
- Agent nêu đúng kế hoạch/kịch bản đang thao tác và hiển thị diff trước thay đổi lớn.

### 9.2. AI Video

- Ít nhất 8/10 bộ video chuẩn chạy hết upload → transcript → review → render → download.
- 100% cut proposal có thể bật/tắt thủ công trước render.
- Transcript có thể sửa; từ confidence thấp được đánh dấu.
- Output đúng 9:16, MP4 H.264/AAC, phát được trên trình duyệt và thiết bị test.
- Caption nằm trong safe area, không tràn khung ở bộ câu dài đã thống nhất.
- Job lỗi có thông báo dễ hiểu và retry không tạo output trùng.
- File gốc và output không truy cập được khi không có quyền/URL hợp lệ.

### 9.3. Sản phẩm và vận hành

- 02–03 Creator hoàn thành UAT mà không cần hướng dẫn kỹ thuật trực tiếp.
- Content Owner chấp nhận ít nhất 80% đầu ra sau tối đa hai lần tạo lại.
- Có backup trước migration và có quy trình rollback được kiểm tra trên môi trường staging.
- Người vận hành xử lý được ba tình huống: provider lỗi, queue kẹt và render lỗi dựa trên runbook.

---

## 10. Dữ liệu và đầu vào cần phối hợp

| Đầu vào cần có | Số lượng/định dạng | Hạn chót |
|---|---|---|
| Hồ sơ Creator DNA mẫu | 3–5 profile thuộc các ngách khác nhau | Ngày 1 |
| Prompt nghiệp vụ thật | 30 prompt; trong đó 10 luồng P0 và 10 prompt gây nhiễu/sai quyền | Ngày 1 |
| Bộ video thô | Tối thiểu 10 bộ, đúng giới hạn MVP | Trước ngày 9 |
| Thành phẩm đối chiếu | 3–5 video đã dựng tốt kèm nhận xét | Trước ngày 11 |
| Từ điển tên riêng/thuật ngữ | Tên người, nhãn hàng, sản phẩm và từ ngành | Trước ngày 11 |
| Brand assets | Logo PNG/SVG, font có license, màu, caption mẫu, nhạc có quyền dùng | Trước ngày 12 |
| Hạ tầng | PostgreSQL, Redis, object storage, worker runtime, secrets | Trước ngày 9 |
| Người duyệt | Một Product/Content Owner có quyền chốt trong ngày | Xuyên suốt |
| Người dùng thử | 2–3 Creator có lịch UAT | Chốt trước ngày 10 |

Thiếu video mẫu, brand asset hoặc người duyệt đúng hạn là rủi ro trực tiếp tới Milestone C.

---

## 11. Rủi ro chính và phương án giảm thiểu

| Rủi ro | Mức | Phương án giảm thiểu |
|---|---|---|
| Agent chọn nhầm skill/đối tượng | Cao | Ground bằng ID, selector rõ, preview và hỏi lại khi có nhiều kết quả |
| Agent tự thực hiện hành động nguy hiểm | Cao | Allowlist, policy engine tách khỏi prompt, confirmation token dùng một lần |
| Prompt injection từ transcript/nội dung | Cao | Xem mọi nội dung người dùng/media là data; không cho thay policy/skill permission |
| Ghi đè thay đổi người dùng | Cao | Revision/version check, diff, idempotency và application service hiện có |
| Scope Agent quá rộng | Cao | Chỉ hỗ trợ catalog skill P0; tối đa 6 bước; ngoài phạm vi thì giải thích rõ |
| Chất lượng STT tiếng Việt/tên riêng thấp | Trung bình | Confidence, từ điển riêng, UI sửa transcript và golden dataset |
| Smart Cut cắt mất ý | Cao | Chỉ tạo đề xuất; mặc định người dùng duyệt trước render |
| Render chậm hoặc queue kẹt | Cao | Worker riêng, progress, timeout, retry có giới hạn và dead-letter state |
| Video làm trễ Agent | Cao | Freeze Milestone A/B; video không được thay đổi hợp đồng Agent core |
| Chi phí AI/video vượt dự kiến | Trung bình | Cost class trên skill, quota, model tiering và log token/job duration |
| Lộ file hoặc secrets | Cao | Signed URL ngắn hạn, tenant check, log redaction, secret chỉ ở server |
| Timeline thiếu người duyệt | Cao | Lịch duyệt cố định cuối ngày 5, 10, 15; quá hạn tự động dùng scope baseline |

---

## 12. Cơ chế báo cáo tiến độ

### Báo cáo hằng ngày — tối đa 10 phút

- Mục tiêu hôm nay.
- Hoàn thành thực tế và link demo/test.
- Chỉ số đang thay đổi: Agent pass rate, lỗi P0, video success rate.
- Blocker cần người quyết định.
- Quyết định hoặc thay đổi scope trong ngày.
- Mục tiêu ngày tiếp theo.

### Báo cáo milestone — ngày 5, 10 và 15

1. Phạm vi đã cam kết.
2. Demo luồng end-to-end.
3. Bảng tiêu chí: Đạt / Chưa đạt / Có điều kiện.
4. Kết quả test và danh sách lỗi theo P0/P1/P2.
5. Rủi ro còn mở và owner.
6. Thay đổi so với baseline về thời gian/phạm vi.
7. Quyết định Go / Go có điều kiện / No-go cho giai đoạn kế tiếp.

### Mẫu bảng báo cáo milestone

| Hạng mục | Kế hoạch | Thực tế | Trạng thái | Bằng chứng | Vướng mắc/Quyết định |
|---|---|---|---|---|---|
| Agent skill | 10 luồng P0 | ... | ... | Test/demo link | ... |
| An toàn | 0 mutation trái phép | ... | ... | Audit report | ... |
| Media job | Upload và trạng thái | ... | ... | Job IDs | ... |
| Video | 8/10 video thành công | ... | ... | Output links | ... |
| Tài liệu | Bộ P0/P1 | ... | ... | Document links | ... |

---

## 13. Các quyết định cần chốt ngay

1. Chấp thuận mốc 15 ngày + 1–2 ngày đệm hay yêu cầu cứng đúng 15 ngày.
2. Chỉ định một người có quyền chốt scope và nghiệm thu trong ngày.
3. Xác nhận Agent chỉ điều khiển skill nội bộ, chưa tích hợp social publishing hay trình duyệt tự do.
4. Xác nhận AI Video là AI-assisted editing bằng STT + đề xuất cắt + FFmpeg, không phải generative video.
5. Chốt provider STT dùng cho MVP và mức chi phí thử nghiệm.
6. Chốt object storage/worker environment cho staging và production.
7. Chốt bộ 10 video cùng brand preset dùng làm golden dataset.

---

## 14. Khuyến nghị Go/No-go

**Khuyến nghị: GO với điều kiện.**

Điều kiện để giữ timeline:

- Scope được đóng trong ngày đầu tiên.
- Không thay provider AI hiện tại trong sprint Agent.
- Video chỉ dùng một preset chính và không có timeline nhiều track.
- Dữ liệu mẫu, hạ tầng và người duyệt được cung cấp đúng hạn.
- Mọi yêu cầu mới sau ngày 2 đi vào backlog hậu MVP trừ lỗi bảo mật hoặc lỗi chặn luồng.

Nếu một trong các điều kiện trên không đáp ứng, ưu tiên bàn giao Agent hoàn chỉnh; video dừng ở media job + transcription hoặc lùi sang sprint kế tiếp thay vì giảm kiểm soát an toàn của Agent.
