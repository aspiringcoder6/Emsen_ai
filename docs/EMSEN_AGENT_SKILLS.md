# Emsen Agent Skills — MVP

Emsen now uses a small, explicit skill registry instead of letting chat code write to product data directly. Each execution records its name, access mode, status, summary, target, and target version on the assistant message that triggered it.

## Registered skills

| Skill | Access | What it does |
| --- | --- | --- |
| `creator_dna.ask_proactive_question` | Read | Selects one safe prompt from the curated Creator DNA question bank. |
| `creator_dna.capture_chat_signals` | Write | Saves one to three non-sensitive signals extracted from a direct user answer. |
| `direction.get_current` | Read | Reads and explains the latest Direction version in chat. |
| `direction.generate_draft` | Draft write | Generates a new Direction draft from Creator DNA and the user's request. |
| `direction.update_draft` | Draft write | Regenerates all or one section of Direction as a new draft version. |

## Safety boundary

Direction skills never create an approved version. They can only create a draft; the user must review and approve it from the Direction workspace. A failed skill does not overwrite the current Direction.

Creator DNA capture remains limited to an answer to an active collection question. The chat model may extract at most three signals, and the server validates the category, confidence, evidence, and summary before storing them.

## Chat examples

- “Cho mình xem định hướng hiện tại.”
- “Tạo định hướng kênh từ Creator DNA của mình.”
- “Đổi giọng điệu trong định hướng thành gần gũi hơn.”
- “Cập nhật lại nhóm khán giả mục tiêu.”
- “Làm mới các trụ cột nội dung nhưng giữ nguyên định vị.”

The server has a deterministic Vietnamese intent fallback for these actions, so reading an existing Direction continues to work even when the chat model is unavailable. Generating or updating a draft still requires the configured AI provider.
