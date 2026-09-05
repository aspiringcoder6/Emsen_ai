import { ArrowLeft, ArrowRight, Bot, Check, CircleHelp, Sparkles } from "lucide-react";
import type {
  CreatorDnaProfile,
  CreatorDnaQuestion,
} from "../creatorDnaTypes";

type AnswerValue = string | string[];

type CreatorDnaQuestionCardProps = {
  canContinue: boolean;
  currentStep: number;
  onBack: () => void;
  onChange: (value: AnswerValue) => void;
  onContinue: () => void;
  onSkipQuestion: () => void;
  onSkipOnboarding: () => void;
  profile: CreatorDnaProfile;
  question: CreatorDnaQuestion;
  totalSteps: number;
  value: AnswerValue;
};

function getCapturedSignals(profile: CreatorDnaProfile) {
  return [
    profile.displayName ? `Cách gọi: ${profile.displayName}` : null,
    profile.niche ? `Lĩnh vực: ${profile.niche}` : null,
    profile.platforms.length ? `Nền tảng: ${profile.platforms.join(" · ")}` : null,
    profile.toneTraits.length ? `Chất giọng: ${profile.toneTraits.join(" · ")}` : null,
    profile.audience ? "Đã có mô tả khán giả" : null,
    profile.boundaries ? "Đã ghi nhận ranh giới" : null,
  ].filter((signal): signal is string => Boolean(signal));
}

export function CreatorDnaQuestionCard({
  canContinue,
  currentStep,
  onBack,
  onChange,
  onContinue,
  onSkipQuestion,
  onSkipOnboarding,
  profile,
  question,
  totalSteps,
  value,
}: CreatorDnaQuestionCardProps) {
  const progress = Math.round(((currentStep + 1) / totalSteps) * 100);
  const capturedSignals = getCapturedSignals(profile);
  const stringValue = typeof value === "string" ? value : "";
  const arrayValue = Array.isArray(value) ? value : [];

  const toggleOption = (option: string) => {
    if (!Array.isArray(value)) {
      onChange(option);
      return;
    }

    if (arrayValue.includes(option)) {
      onChange(arrayValue.filter((item) => item !== option));
      return;
    }

    if (question.id === "toneTraits" && arrayValue.length >= 3) {
      return;
    }

    onChange([...arrayValue, option]);
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#DDEBD6] bg-white shadow-[0_22px_60px_rgba(40,77,49,0.08)]">
      <div className="border-b border-[#E4EFE0] bg-[#FFFDF8] px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#E3F2DB] text-sm font-bold text-[#46A82D]">
              {String(currentStep + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#46A82D]">
                {question.phase}
              </p>
              <p className="mt-0.5 text-xs text-[#829782]">
                Câu {currentStep + 1} / {totalSteps}
              </p>
            </div>
          </div>
          <button
            className="text-xs font-bold text-[#829782] transition hover:text-[#46A82D]"
            onClick={onSkipOnboarding}
            type="button"
          >
            Để sau
          </button>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#F4E7E3]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#67B86F] via-[#82C95B] to-[#46A82D] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                question.required
                  ? "bg-[#E3F2DB] text-[#46A82D]"
                  : "bg-[#EEF8EF] text-[#3F7E49]"
              }`}
            >
              {question.required ? "Cần để bắt đầu" : "Khuyến nghị"}
            </span>
            {!question.required ? (
              <span className="text-[11px] text-[#94A794]">Bạn có thể bỏ qua câu này</span>
            ) : null}
          </div>

          <h2 className="mt-5 max-w-2xl text-2xl font-bold leading-tight tracking-[-0.035em] text-[#284D31] sm:text-3xl">
            {question.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#748A74]">
            {question.description}
          </p>

          <div className="mt-7">
            {question.kind === "text" ? (
              <input
                autoFocus
                className="h-14 w-full rounded-2xl border border-[#D5E6CF] bg-[#FFFDF8] px-4 text-base font-semibold text-[#31583A] outline-none transition placeholder:font-normal placeholder:text-[#9CAF98] focus:border-[#82C95B] focus:bg-white focus:ring-4 focus:ring-[#82C95B]/10"
                onChange={(event) => onChange(event.target.value)}
                placeholder={question.placeholder}
                value={stringValue}
              />
            ) : null}

            {question.kind === "single" ? (
              <>
                <div className="flex flex-wrap gap-2.5">
                  {question.options?.map((option) => {
                    const selected = stringValue === option;
                    return (
                      <button
                        className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                          selected
                            ? "border-[#46A82D] bg-[#E3F2DB] text-[#46A82D] shadow-[0_7px_18px_rgba(70,168,45,0.12)]"
                            : "border-[#D8E6D2] bg-white text-[#526952] hover:border-[#82C95B] hover:bg-[#F7FBF3]"
                        }`}
                        key={option}
                        onClick={() => onChange(option)}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs font-bold text-[#91A38F]">hoặc</span>
                  <input
                    className="h-12 min-w-0 flex-1 rounded-2xl border border-[#D5E6CF] bg-[#FFFDF8] px-4 text-sm text-[#31583A] outline-none transition placeholder:text-[#9CAF98] focus:border-[#82C95B] focus:bg-white focus:ring-4 focus:ring-[#82C95B]/10"
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={question.placeholder}
                    value={stringValue}
                  />
                </div>
              </>
            ) : null}

            {question.kind === "multi" ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {question.options?.map((option) => {
                  const selected = arrayValue.includes(option);
                  return (
                    <button
                      aria-pressed={selected}
                      className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                        selected
                          ? "border-[#46A82D] bg-[#EAF6E4] text-[#46A82D]"
                          : "border-[#D8E6D2] bg-white text-[#526952] hover:border-[#82C95B] hover:bg-[#F7FBF3]"
                      }`}
                      key={option}
                      onClick={() => toggleOption(option)}
                      type="button"
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${
                          selected
                            ? "border-[#46A82D] bg-[#46A82D] text-white"
                            : "border-[#DCC7C2] text-transparent"
                        }`}
                      >
                        <Check size={14} strokeWidth={3} />
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {question.kind === "textarea" ? (
              <textarea
                autoFocus
                className="flow-scrollbar min-h-36 w-full resize-none rounded-2xl border border-[#D5E6CF] bg-[#FFFDF8] px-4 py-4 text-sm leading-6 text-[#31583A] outline-none transition placeholder:text-[#9CAF98] focus:border-[#82C95B] focus:bg-white focus:ring-4 focus:ring-[#82C95B]/10"
                onChange={(event) => onChange(event.target.value)}
                placeholder={question.placeholder}
                value={stringValue}
              />
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[#E6F0E1] pt-5">
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#D8E6D2] bg-white px-4 text-sm font-bold text-[#526952] transition hover:border-[#82C95B] hover:text-[#46A82D]"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft size={16} />
              Quay lại
            </button>
            {!question.required ? (
              <button
                className="h-11 px-2 text-sm font-bold text-[#829782] transition hover:text-[#46A82D]"
                onClick={onSkipQuestion}
                type="button"
              >
                Bỏ qua câu này
              </button>
            ) : null}
            <button
              className="group ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#46A82D] to-[#82C95B] px-5 text-sm font-bold text-white shadow-[0_9px_22px_rgba(70,168,45,0.22)] transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:-translate-y-0.5"
              disabled={!canContinue}
              onClick={onContinue}
              type="button"
            >
              {currentStep === totalSteps - 1 ? "Hoàn tất" : "Tiếp tục"}
              <ArrowRight
                className="transition-transform group-enabled:group-hover:translate-x-0.5"
                size={16}
              />
            </button>
          </div>
        </div>

        <aside className="border-t border-[#DDEBD6] bg-gradient-to-b from-[#F7FBF3] to-[#F8FBF5] p-5 sm:p-7 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#46A82D] to-[#82C95B] text-white shadow-[0_8px_20px_rgba(70,168,45,0.2)]">
              <Bot size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#284D31]">emsen đang học</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#46A82D]">
                  Backend AI
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#829782]">Đánh giá sau khi hoàn tất 6 câu</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-[#526952]">
              <Sparkles className="text-[#46A82D]" size={15} />
              Tín hiệu từ câu này
            </div>
            <p className="mt-2 text-sm leading-6 text-[#607760]">{question.signal}</p>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A794]">
              Đã hiểu được
            </p>
            <div className="mt-3 space-y-2">
              {capturedSignals.length ? (
                capturedSignals.map((signal) => (
                  <div
                    className="flex items-start gap-2.5 rounded-xl bg-white/70 px-3 py-2.5 text-xs leading-5 text-[#526952]"
                    key={signal}
                  >
                    <Check className="mt-0.5 shrink-0 text-[#67B86F]" size={14} />
                    {signal}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#E4CEC9] px-3 py-4 text-center text-xs leading-5 text-[#94A794]">
                  Tín hiệu đầu tiên sẽ xuất hiện sau câu trả lời này.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2.5 border-t border-[#E7DDD7] pt-5 text-[11px] leading-5 text-[#829782]">
            <CircleHelp className="mt-0.5 shrink-0" size={15} />
            Tiến độ được tự động lưu trên backend. Khi hoàn tất, Gemini sẽ đánh giá; nếu
            chưa có API key, hệ thống dùng fallback an toàn.
          </div>
        </aside>
      </div>
    </section>
  );
}
