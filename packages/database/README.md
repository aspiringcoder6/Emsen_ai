# Database

Schema và migration runtime hiện nằm trong `apps/api/src/database` vì chúng chỉ
được API sử dụng ở giai đoạn MVP. Package này được giữ lại làm điểm chuyển tới
một database client/schema dùng chung khi worker bắt đầu đọc hoặc ghi cùng dữ
liệu.

PostgreSQL local được expose ở cổng `5433` để tránh xung đột với PostgreSQL đã
có sẵn trên máy phát triển. API vẫn kết nối qua biến `DATABASE_URL`.
