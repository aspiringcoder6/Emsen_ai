## **MVP CreatorFlowAI**

**Thời gian thực hiện:** 3 tuần  
**Mô tả:** Một MVP nội bộ chạy được chọn luồng hỗ trợ creators trong việc tạo content dựa trên DNA của chính creator đó

1. ## **Phạm vi của MVP**

| Thành phần | Mục tiêu trong 3 tuần | Trong giai đoạn sau |
| ----- | ----- | ----- |
| Creator DNA | Form để tạo DNA của creators, red flags, lưu phiên bản khác nhau của creators, admin duyệt profile | Chat onboarding cho từng creator, AI tự nghiên cứu thương hiệu khi điền link kênh |
| Master Direction | Định vị, tone, audience, content pillars | Phân tích thị trường tự động |
| Content Plan | Ma trận nội dung và kế hoạch 7 ngày | Lịch đăng, tự động lấy trend |
| Kịch bản | Hook, nội dung, twist, CTA, soft-selling | Dự đoán tính “viral” của video, đánh giá theo trend |
| Storyboard | Cảnh, lời thoại, góc quay, text, sản phẩm | Sinh hình ảnh/B-roll tự động |
| Video Editor | Smart Cut cơ bản, caption, logo/font/màu, nhạc nền, export | Timeline nhiều track như CapCut, hỗ trợ AI sâu hơn |
| Director Mode | Teleprompter đơn giản nếu còn thời gian | Quay trực tiếp, camera processing nâng cao |
| Quản trị | Login, workspace, job status, lịch sử kết quả | Billing, subscription, social publishing |

**Giới hạn video đầu vào:**  
Tạm thời sẽ như này cho MVP để dễ test, đến khi mở rộng thì làm thêm

* Video dọc 9:16.  
* Thành phẩm 30–180 giây.  
* 1–10 clip đầu vào.  
* Tối đa 15 phút hoặc 2 GB.  
* Một người nói chính.  
* Không tự crop video ngang.  
* Không tự chọn stock footage/B-roll.  
* Caption chỉ có 1–2 template cố định.  
* Smart Cut đưa ra đề xuất; người dùng có thể bật/tắt đoạn cắt trước khi render.

2. ## **Kiến trúc MVP**

* **Frontend:** React \+Tailwindcss.  
* **Backend:** Node.js \+ Express.  
* **Database:** PostgreSQL.  
* **Media storage:** MinIO hoặc S3-compatible storage tạo trên máy công ty.  
* **Queue:** Redis \+ BullMQ để xử lý transcription/render bất đồng bộ.  
* **Video worker:** FFmpeg chạy trong container riêng.  
* **AI:** Một lớp LLM Provider Adapter để sau này đổi nhà cung cấp mà không sửa business logic. Trong MVP sẽ sử dụng những model Open Source chạy local. Khi vào production sẽ nâng cấp AI lên chạy trong máy công ti  
* **Triển khai:** Docker Compose trên hạ tầng công ty.

### **Creator DNA và 4-Layer Engine**

Trong MVP thì vì Creator DNA còn ngắn, chưa nhiều brand knowledge nên tạm thời không cần RAG mà như này:

1. Lưu DNA dưới dạng JSON có version.  
2. Chèn trực tiếp DNA vào mỗi bước prompt.  
3. Chạy prompt chaining theo từng tầng.  
4. Mỗi tầng trả về JSON theo schema cố định.  
5. Cho phép sửa và tạo lại riêng từng tầng, kiểu script sửa riêng, storyboard riêng,....

### **Video Editor**

MVP nên dùng **FFmpeg \+ file subtitle ASS**, sẽ chưa dùng đến Remotion như đề xuất của anh Thắng, sẽ cung cấp cho AI Agent những khả năng sau:

* Phát hiện khoảng lặng.  
* Cắt và ghép các segment.  
* Burn caption vào video.  
* Chèn logo.  
* Chuẩn hóa âm lượng.  
* Trộn nhạc và giảm nhạc khi có lời nói.  
* Xuất MP4 H.264/AAC.

## **3\. Tiêu chí hoàn thành MVP** 

* Creator DNA được lưu, duyệt và áp dụng vào mọi output AI.  
* Sinh đủ bốn tầng với output có cấu trúc, có thể sửa và sinh lại.  
* Content Owner chấp nhận ít nhất 80% output sau tối đa hai lần tạo lại trên bộ test đã thống nhất.  
* Ít nhất 8/10 video chuẩn chạy hết luồng mà không cần developer can thiệp.  
* Người dùng sửa được transcript và quyết định đoạn cắt trước khi render.  
* Video export đúng 9:16, có caption, logo, font/màu và nhạc nền.  
* File người dùng không public; truy cập bằng signed URL.  
* Có log lỗi, trạng thái job, retry và theo dõi chi phí API.

