# API modules

Route và service nghiệp vụ sẽ được thêm theo từng milestone. Danh sách dự kiến:
authentication, workspaces, creator DNA, content generation, projects, media,
jobs và review. Hiện API chỉ có health check.
## Backend modules

- `auth`: đăng ký, đăng nhập, mật khẩu scrypt và session cookie HttpOnly.
- `creator-dna`: lưu onboarding, tín hiệu tích lũy và trả hồ sơ theo người dùng.
- `ai`: đánh giá người dùng qua Gemini, có fallback có cấu trúc khi chưa có API key.
