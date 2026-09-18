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
| `content_plan.get_current` | Read | Reads and summarizes the latest or explicitly named Content Plan. |
| `content_plan.generate_draft` | Draft write | Creates a separate named Content Plan draft from the latest Direction, schedule, weekly target, and chat request. |
| `content_plan.update_draft` | Draft write | Selects an existing plan by ID/name and creates a revised draft while preserving unspecified schedule fields. |
| `script.get_current` | Read | Lists scripts or reads the named script, including hook, body, CTA, and text storyboard. |
| `script.create_draft` | Draft write | Creates an independent script or a script linked to one item in an approved Content Plan. |
| `script.update_draft` | Draft write | Updates one script section or explicit video settings while keeping other fields and its working status. |

## Safety boundary

Direction and Content Plan skills never create an approved version. They can only create a draft; the user must review and approve it from the relevant workspace. A plan draft may follow the latest Direction draft, but approving that plan still requires an approved Direction. A failed skill does not overwrite the current version.

Content Plan updates use the existing application service, including ownership checks, optimistic version checks, schedule validation, and AI provider isolation. When multiple plans have similar names, the skill stops instead of guessing. Unspecified week, availability, target, and focus fields are preserved on update.

Creator DNA capture remains limited to an answer to an active collection question. The chat model may extract at most three signals, and the server validates the category, confidence, evidence, and summary before storing them.

Script skills use the existing user-scoped script service. A plan-linked script must select exactly one approved schedule item; an ambiguous script or plan item requires clarification. Creating a script always starts in draft. Section edits apply only to draft/in-progress scripts, use revision checks, and preserve untouched sections. Chat does not expose script deletion, finalization, or publishing; those still require direct action in the Script workspace. Chat writes the draft immediately and asks the user to review it afterward—there is not yet a separate pre-apply diff or confirmation token.

## Chat examples

- “Cho mình xem định hướng hiện tại.”
- “Tạo định hướng kênh từ Creator DNA của mình.”
- “Đổi giọng điệu trong định hướng thành gần gũi hơn.”
- “Cập nhật lại nhóm khán giả mục tiêu.”
- “Làm mới các trụ cột nội dung nhưng giữ nguyên định vị.”
- “Tạo kế hoạch nội dung tuần sau, mình rảnh thứ Ba và thứ Bảy, mục tiêu 3 video.”
- “Cho mình xem Kế hoạch nội dung 01.”
- “Cập nhật Kế hoạch nội dung 01, chuyển lịch sang thứ Sáu và để 2 video.”
- “Cho mình xem các kịch bản hiện có.”
- “Tạo kịch bản về Bắt đầu làm content.”
- “Tạo kịch bản từ Kế hoạch nội dung 01 cho nội dung ‘Một ngày bắt đầu lại’.”
- “Sửa hook của kịch bản ‘Bắt đầu làm content’ cho gần gũi hơn.”
- “Đổi thời lượng kịch bản ‘Bắt đầu làm content’ thành 30 giây.”

The server has a deterministic Vietnamese intent fallback for these actions, including extraction of common week, weekday, target, plan-name, script-title, section, and duration phrases. Read skills continue to work when the chat model is unavailable. AI writing and section assistance require the configured AI provider; a blank manual script and explicit settings changes do not.
