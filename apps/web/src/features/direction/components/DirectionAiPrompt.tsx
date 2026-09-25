import { ChevronDown, MessageCircleMore, SendHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";

const quickRequests = [
  "Giữ ý chính, viết tự nhiên hơn",
  "Cụ thể và dễ hiểu hơn",
  "Đề xuất một hướng khác rõ ràng",
];

export function DirectionAiPrompt({
  canGenerate,
  disabled,
  onSubmit,
  subject,
}: {
  canGenerate: boolean;
  disabled: boolean;
  onSubmit: (instruction: string) => void;
  subject: string;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [lastInstruction, setLastInstruction] = useState("");

  const submit = () => {
    const nextInstruction = instruction.trim();
    if (!nextInstruction || disabled || !canGenerate) return;
    setLastInstruction(nextInstruction);
    setInstruction("");
    onSubmit(nextInstruction);
  };

  return (
    <div className="mt-3 rounded-2xl border border-[#D8E8D2] bg-[#F7FBF4]">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-xs font-bold text-[#3F7D3D] disabled:opacity-50"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MessageCircleMore size={15} />
        Trao đổi với Emsen để chỉnh dần phần này
        <ChevronDown
          className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`}
          size={15}
        />
      </button>

      {open ? (
        <div className="border-t border-[#E3EEE0] p-3.5">
          <p className="text-[11px] leading-5 text-[#748A74]">
            Nói điều bạn muốn giữ, bỏ hoặc thay đổi trong {subject.toLocaleLowerCase("vi-VN")}.
            Emsen sẽ chỉ viết lại đúng mục này.
          </p>
          {lastInstruction ? (
            <div className="mt-3 ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[#31583A] px-3 py-2 text-[11px] leading-5 text-white">
              {lastInstruction}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {quickRequests.map((request) => (
              <button
                className="rounded-full border border-[#D3E2CD] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#557058] hover:border-[#82C95B]"
                disabled={disabled || !canGenerate}
                key={request}
                onClick={() => setInstruction(request)}
                type="button"
              >
                {request}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <textarea
              aria-label={`Yêu cầu Emsen chỉnh ${subject.toLocaleLowerCase("vi-VN")}`}
              className="min-h-20 min-w-0 flex-1 resize-y rounded-xl border border-[#D5E5CF] bg-white px-3 py-2.5 text-xs leading-5 text-[#31583A] outline-none placeholder:text-[#9AAC98] focus:border-[#82C95B] focus:ring-2 focus:ring-[#DDEED6]"
              disabled={disabled || !canGenerate}
              maxLength={1200}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Ví dụ: Giữ ý về sự gần gũi, nhưng rút ngắn và làm rõ giá trị khác biệt…"
              value={instruction}
            />
            <button
              aria-label="Gửi yêu cầu cho Emsen"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#31583A] text-white disabled:opacity-35"
              disabled={disabled || !canGenerate || !instruction.trim()}
              onClick={submit}
              type="button"
            >
              {disabled ? <Sparkles className="animate-pulse" size={15} /> : <SendHorizontal size={15} />}
            </button>
          </div>
          {!canGenerate ? (
            <p className="mt-2 text-[10px] leading-4 text-[#9A744E]">
              Hoàn thiện bản định hướng hiện tại và kết nối AI để trao đổi với Emsen.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
