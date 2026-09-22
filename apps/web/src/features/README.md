# Feature folders

Mỗi feature chứa component, dữ liệu mẫu và logic riêng của một miền nghiệp vụ.

- `auth`: giao diện và persistence cho đăng nhập/đăng ký.
- `chat`: trạng thái, storage và UI của emsen buddy.
- `creator-dna`: onboarding 5 câu hỏi, vòng lặp tín hiệu tích lũy và các engine demo có thể thay thế.
- `dashboard`: dữ liệu và các widget của trang tổng quan.
- `video`: Video Studio, quay bằng teleprompter hoặc tải clip, theo dõi xử lý và duyệt transcript.

Các trang trong `src/pages` chỉ chịu trách nhiệm ghép những feature này thành
một màn hình hoàn chỉnh. Component dùng chung nằm trong `src/components`.
