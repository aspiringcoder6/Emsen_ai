# API modules

Các route và service nghiệp vụ được tách theo miền, dùng contract chung và dữ
liệu PostgreSQL theo từng người dùng.
## Backend modules

- `auth`: đăng ký, đăng nhập, mật khẩu scrypt và session cookie HttpOnly.
- `creator-dna`: lưu onboarding, tín hiệu tích lũy và trả hồ sơ theo người dùng.
- `ai`: đánh giá người dùng qua Gemini, có fallback có cấu trúc khi chưa có API key.
- `video`: dự án video gắn với kịch bản, upload/quay trực tiếp, media job và transcript có timestamp.
