import {
  BookHeart,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  MessageCircleMore,
  PencilLine,
  RotateCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  creatorDnaSignalCategories,
  getLearningPrompt,
  learningSourceOptions,
} from "../creatorDnaConfig";
import type {
  CreatorDnaLearningSignal,
  CreatorDnaLearningSource,
  CreatorDnaLearningState,
  CreatorDnaProfile,
  CreatorDnaSignalCategory,
  CreatorDnaSignalSuggestion,
} from "../creatorDnaTypes";
import { demoCreatorDnaLearningEngine } from "../services/creatorDnaLearningEngine";

type CreatorDnaLearningLoopProps = {
  learning: CreatorDnaLearningState;
  onConfirmSignal: (
    source: CreatorDnaLearningSource,
    suggestion: CreatorDnaSignalSuggestion,
  ) => Promise<void>;
  onRemoveSignal: (signalId: string) => Promise<void>;
  profile: CreatorDnaProfile;
};

const sourceLabels: Record<CreatorDnaLearningSource, string> = {
  "ai-chat": "Trò chuyện AI",
  "daily-story": "Câu chuyện",
  "script-feedback": "Phản hồi kịch bản",
  "direct-update": "Cập nhật trực tiếp",
};

function countBaseSignals(profile: CreatorDnaProfile) {
  return Object.values(profile).filter((value) =>
    Array.isArray(value) ? value.length > 0 : value.trim().length > 0,
  ).length;
}

function getMaturity(baseSignalCount: number, learnedSignalCount: number) {
  const score = Math.min(100, 18 + baseSignalCount * 8 + learnedSignalCount * 6);
  const label =
    learnedSignalCount === 0
      ? "Điểm khởi đầu"
      : learnedSignalCount < 5
        ? "Đang bén rễ"
        : learnedSignalCount < 10
          ? "Đang đậm nét"
          : "Giàu tín hiệu";

  return { label, score };
}

function formatCapturedAt(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function CreatorDnaLearningLoop({
  learning,
  onConfirmSignal,
  onRemoveSignal,
  profile,
}: CreatorDnaLearningLoopProps) {
  const [source, setSource] = useState<CreatorDnaLearningSource>("daily-story");
  const [input, setInput] = useState("");
  const [suggestion, setSuggestion] = useState<CreatorDnaSignalSuggestion | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const prompt = getLearningPrompt(source, learning.promptCursor);
  const baseSignalCount = countBaseSignals(profile);
  const maturity = getMaturity(baseSignalCount, learning.signals.length);

  const changeSource = (nextSource: CreatorDnaLearningSource) => {
    setSource(nextSource);
    setInput("");
    setSuggestion(null);
  };

  const analyzeSignal = async () => {
    if (input.trim().length < 8) {
      return;
    }

    setAnalyzing(true);
    try {
      const nextSuggestion = await demoCreatorDnaLearningEngine.analyze({
        profile,
        prompt,
        source,
        text: input,
      });
      setSuggestion(nextSuggestion);
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmSignal = async () => {
    if (!suggestion) {
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      await onConfirmSignal(source, suggestion);
      setInput("");
      setSuggestion(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Chưa thể lưu tín hiệu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#DDEBD6] bg-white shadow-[0_18px_52px_rgba(40,77,49,0.07)]">
      <div className="border-b border-[#E4EFE0] bg-gradient-to-r from-[#FFFDF8] to-[#F7FBF4] px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#E3F2DB] text-[#46A82D]">
              <RotateCw size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#46A82D]">
                  Vòng lặp tích lũy tri thức
                </p>
              </div>
              <h2 className="mt-1 text-xl font-bold text-[#284D31] sm:text-2xl">
                Creator DNA lớn dần cùng bạn
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#748A74]">
                Kể một chuyện, phản hồi một kịch bản hoặc cập nhật trực tiếp. Emsen đề xuất
                tín hiệu, chỉ khi bạn muốn, tín hiệu đó mới được ghi nhớ.
              </p>
            </div>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-[#E1EDD9] bg-white/80 p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#82927F]">
                  Độ trưởng thành
                </p>
                <p className="mt-1 text-sm font-bold text-[#284D31]">{maturity.label}</p>
              </div>
              <span className="text-2xl font-bold text-[#4C9355]">{maturity.score}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E7F0E3]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#67B86F] to-[#82C95B] transition-[width] duration-500"
                style={{ width: `${maturity.score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="p-5 sm:p-7">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {learningSourceOptions.map((option) => {
              const selected = option.id === source;
              return (
                <button
                  aria-pressed={selected}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[#46A82D] bg-[#EFF8E9] shadow-[0_8px_20px_rgba(70,168,45,0.1)]"
                      : "border-[#DCE9D7] bg-[#FFFDF8] hover:border-[#82C95B] hover:bg-[#F7FBF3]"
                  }`}
                  key={option.id}
                  onClick={() => changeSource(option.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${selected ? "text-[#46A82D]" : "text-[#526952]"}`}>
                      {option.label}
                    </span>
                    <ChevronRight className={selected ? "text-[#46A82D]" : "text-[#B9A29E]"} size={15} />
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-[#829782]">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-[22px] border border-[#DDEBD6] bg-[#FFFDF8] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#E3F2DB] text-[#46A82D]">
                <MessageCircleMore size={19} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A794]">
                  emsen hỏi một câu thôi
                </p>
                <h3 className="mt-1 text-base font-bold leading-6 text-[#284D31]">{prompt}</h3>
              </div>
            </div>

            <textarea
              className="flow-scrollbar mt-5 min-h-32 w-full resize-none rounded-2xl border border-[#D5E6CF] bg-white px-4 py-4 text-sm leading-6 text-[#31583A] outline-none transition placeholder:text-[#9CAF98] focus:border-[#82C95B] focus:ring-4 focus:ring-[#82C95B]/10"
              onChange={(event) => {
                setInput(event.target.value);
                setSuggestion(null);
              }}
              placeholder="Kể tự nhiên như đang nhắn với một người bạn…"
              value={input}
            />

            {!suggestion ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[11px] leading-5 text-[#829782]">
                  <CircleHelp size={14} />
                  Chưa muốn kể cũng không sao — bạn có thể quay lại sau.
                </p>
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#46A82D] to-[#82C95B] px-5 text-sm font-bold text-white shadow-[0_9px_22px_rgba(70,168,45,0.2)] transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:-translate-y-0.5"
                  disabled={input.trim().length < 8 || analyzing}
                  onClick={() => void analyzeSignal()}
                  type="button"
                >
                  <Sparkles className={analyzing ? "animate-spin" : ""} size={16} />
                  {analyzing ? "Đang đọc tín hiệu…" : "Xem tín hiệu đề xuất"}
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-[22px] border border-[#E1EDD9] bg-[#F5FAF3] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Bot className="text-[#4C9355]" size={17} />
                    <p className="text-xs font-bold text-[#284D31]">Tín hiệu demo đề xuất</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#4C9355]">
                    Độ chắc chắn {suggestion.confidence}%
                  </span>
                </div>

                <label className="mt-4 block">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#82927F]">
                    Nhóm Creator DNA
                  </span>
                  <select
                    className="mt-2 h-11 w-full rounded-xl border border-[#D9E6D3] bg-white px-3 text-sm font-bold text-[#5D715A] outline-none focus:border-[#67B86F] focus:ring-4 focus:ring-[#67B86F]/10"
                    onChange={(event) =>
                      setSuggestion((current) =>
                        current
                          ? {
                              ...current,
                              category: event.target.value as CreatorDnaSignalCategory,
                            }
                          : current,
                      )
                    }
                    value={suggestion.category}
                  >
                    {creatorDnaSignalCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#82927F]">
                    Điều emsen sẽ ghi nhớ
                  </span>
                  <textarea
                    className="mt-2 min-h-20 w-full resize-none rounded-xl border border-[#D9E6D3] bg-white px-3 py-3 text-sm leading-6 text-[#5D715A] outline-none focus:border-[#67B86F] focus:ring-4 focus:ring-[#67B86F]/10"
                    onChange={(event) =>
                      setSuggestion((current) =>
                        current ? { ...current, summary: event.target.value } : current,
                      )
                    }
                    value={suggestion.summary}
                  />
                </label>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#DCE9D7] pt-4">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4C9355] px-4 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:-translate-y-0.5"
                    disabled={!suggestion.summary.trim() || saving}
                    onClick={() => void confirmSignal()}
                    type="button"
                  >
                    <Check size={15} strokeWidth={3} />
                    {saving ? "Đang lưu…" : "Xác nhận và ghi nhớ"}
                  </button>
                  <button
                    className="h-10 px-2 text-xs font-bold text-[#82927F] transition hover:text-[#46A82D]"
                    onClick={() => setSuggestion(null)}
                    type="button"
                  >
                    Bỏ qua tín hiệu này
                  </button>
                  <p className="ml-auto text-[10px] text-[#82927F]">Bạn có thể sửa trước khi xác nhận</p>
                </div>
                {saveError ? (
                  <p className="mt-3 text-xs font-semibold text-[#B83F3F]">{saveError}</p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <aside className="border-t border-[#DDEBD6] bg-[#FBFDF7] p-5 sm:p-7 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A794]">
                Bộ nhớ đã xác nhận
              </p>
              <h3 className="mt-1 text-lg font-bold text-[#284D31]">{learning.signals.length} tín hiệu tích lũy</h3>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#E3F2DB] text-[#46A82D]">
              <BookHeart size={19} />
            </div>
          </div>

          <div className="flow-scrollbar mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {learning.signals.length ? (
              learning.signals.map((signal: CreatorDnaLearningSignal) => (
                <article className="rounded-2xl border border-[#DCE9D7] bg-white p-4" key={signal.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-[#EAF6E4] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#46A82D]">
                        {signal.category}
                      </span>
                      <p className="mt-3 text-sm font-semibold leading-6 text-[#5F494A]">{signal.summary}</p>
                    </div>
                    <button
                      aria-label={`Gỡ tín hiệu ${signal.summary}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[#B49B97] transition hover:bg-[#EAF6E4] hover:text-[#D75C5C]"
                      onClick={() => void onRemoveSignal(signal.id)}
                      title="Gỡ tín hiệu"
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#F2E5E1] pt-3 text-[10px] text-[#A38D89]">
                    <span>{sourceLabels[signal.source]}</span>
                    <span>{formatCapturedAt(signal.createdAt)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#DFC9C4] bg-white/60 px-5 py-9 text-center">
                <BookHeart className="mx-auto text-[#D7B8B2]" size={28} />
                <p className="mt-3 text-sm font-bold text-[#607760]">Chưa có tín hiệu tích lũy</p>
                <p className="mt-2 text-xs leading-5 text-[#A38D89]">
                  Tín hiệu đầu tiên sẽ xuất hiện ở đây sau khi bạn xem và xác nhận.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-start gap-2.5 border-t border-[#DCE9D7] pt-5 text-[11px] leading-5 text-[#829782]">
            <PencilLine className="mt-0.5 shrink-0" size={14} />
            Mỗi tín hiệu đều có nguồn rõ ràng và có thể gỡ khỏi bộ nhớ bất cứ lúc nào.
          </div>
        </aside>
      </div>
    </section>
  );
}
