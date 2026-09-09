import type {
  DirectionGoalSuggestionDto,
  DirectionSection,
  DirectionStateDto,
  DirectionVersionDto,
} from "@creator-flow/contracts";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  History,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EmsenAvatar,
  type AvatarActivity,
  type AvatarEmotion,
} from "../components/branding/EmsenAvatar";
import { ContentPillarsEditor } from "../features/direction/components/ContentPillarsEditor";
import { DirectionContext } from "../features/direction/components/DirectionContext";
import {
  DirectionField,
  directionInputClass,
} from "../features/direction/components/DirectionField";
import { generateDirectionGoalSuggestions } from "../features/direction/directionApi";
import { useDirection } from "../features/direction/useDirection";

const fields = [
  {
    key: "positioning",
    title: "Định vị kênh",
    hint: "Bạn muốn được nhớ đến vì điều gì? Nội dung mang lại giá trị khác biệt nào?",
  },
  {
    key: "tone",
    title: "Giọng điệu & cách thể hiện",
    hint: "Cách xưng hô, nhịp kể chuyện, những cách nói nên dùng và cần tránh.",
  },
  {
    key: "audience",
    title: "Khán giả bạn muốn đồng hành",
    hint: "Họ là ai, đang cần gì và vì sao họ muốn quay lại với nội dung của bạn?",
  },
] as const;

type DirectionPageProps = {
  active: boolean;
  compact: boolean;
  onContentPlan: () => void;
  onOpenDna: () => void;
};

type HistoryProps = {
  approved: DirectionVersionDto | undefined;
  locked: boolean;
  onReload: () => void;
  onSelect: (version: DirectionVersionDto) => void;
  selectedVersion: number;
  state: DirectionStateDto;
};

function DirectionHistory({
  approved,
  locked,
  onReload,
  onSelect,
  selectedVersion,
  state,
}: HistoryProps) {
  return (
    <details className="group rounded-[22px] border border-[#DDEBD6] bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F0F7EB] text-[#487D50]">
          <History size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#284D31]">Các phiên bản trước</span>
          <span className="mt-0.5 block text-xs text-[#748A74]">
            {state.versions.length
              ? `${state.versions.length} phiên bản · ${approved ? `Đã chốt bản ${approved.version}` : "Chưa có bản đã chốt"}`
              : "Chưa có phiên bản nào được lưu"}
          </span>
        </span>
        <ChevronDown
          className="text-[#829782] transition-transform group-open:rotate-180"
          size={18}
        />
      </summary>

      <div className="border-t border-[#E8F0E4] px-5 pb-5 pt-4">
        <div className="flow-scrollbar max-h-80 space-y-2 overflow-y-auto">
          {state.versions.length === 0 ? (
            <p className="rounded-xl bg-[#F8FBF5] px-4 py-6 text-center text-xs text-[#748A74]">
              Bản nháp và bản đã chốt sẽ xuất hiện tại đây.
            </p>
          ) : null}
          {state.versions.map((version) => (
            <button
              aria-pressed={version.version === selectedVersion}
              className={`w-full rounded-xl border p-3 text-left transition ${
                version.version === selectedVersion
                  ? "border-[#73B55E] bg-[#F3F9EF]"
                  : "border-[#E5EEE1] hover:bg-[#F8FBF5]"
              }`}
              disabled={locked}
              key={version.id}
              onClick={() => onSelect(version)}
              type="button"
            >
              <span className="flex items-center justify-between gap-2 text-xs font-bold">
                Phiên bản {version.version}
                <span
                  className={version.status === "approved" ? "text-[#527F56]" : "text-[#A26B46]"}
                >
                  {version.status === "approved" ? "Đã chốt" : "Bản nháp"}
                </span>
              </span>
              <span className="mt-1 block text-[11px] text-[#748A74]">
                {version.source === "ai" ? "Emsen đề xuất" : "Bạn đã lưu"} ·{" "}
                {new Date(version.createdAt).toLocaleString("vi-VN", {
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "2-digit",
                })}
              </span>
            </button>
          ))}
        </div>
        <button
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg p-1 text-xs font-bold text-[#467E43]"
          disabled={locked}
          onClick={onReload}
          type="button"
        >
          <RefreshCw size={13} /> Tải bản mới nhất
        </button>
      </div>
    </details>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!value) {
      setCanExpand(false);
      return;
    }
    if (expanded) {
      return;
    }

    const text = textRef.current;
    if (!text) {
      return;
    }
    const measure = () => setCanExpand(text.scrollHeight > text.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    return () => observer.disconnect();
  }, [expanded, value]);

  useEffect(() => {
    setExpanded(false);
  }, [value]);

  return (
    <div className="min-w-0 rounded-2xl border border-[#E2EDE0] bg-[#FAFCF8] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6E876D]">{label}</p>
      <p
        className={`mt-2 text-sm leading-6 text-[#31583A] ${expanded ? "" : "line-clamp-3"}`}
        ref={textRef}
      >
        {value || "Emsen sẽ giúp bạn hoàn thiện phần này."}
      </p>
      {canExpand ? (
        <button
          aria-expanded={expanded}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#3F7D3D] hover:text-[#46A82D]"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
          <ChevronDown
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            size={14}
          />
        </button>
      ) : null}
    </div>
  );
}

export function DirectionPage({
  active,
  compact,
  onContentPlan,
  onOpenDna,
}: DirectionPageProps) {
  const direction = useDirection(active);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [goalSuggestions, setGoalSuggestions] = useState<DirectionGoalSuggestionDto[]>([]);
  const [goalSuggestionsLoading, setGoalSuggestionsLoading] = useState(false);
  const [goalSuggestionsError, setGoalSuggestionsError] = useState("");
  const requestedGoalContext = useRef("");
  const goalSuggestionRequestId = useRef(0);
  const { state, brief, content, selectedVersion, dirty, busy, loading, error, notice } =
    direction;
  const locked = Boolean(busy) || loading;
  const total = content.pillars.reduce((sum, pillar) => sum + pillar.percentage, 0);
  const valid = Boolean(
    brief.goal.trim() &&
      content.positioning.trim() &&
      content.tone.trim() &&
      content.audience.trim() &&
      total === 100 &&
      content.pillars.length >= 3 &&
      content.pillars.length <= 5 &&
      new Set(
        content.pillars.map((pillar) => pillar.name.trim().toLocaleLowerCase("vi-VN")),
      ).size === content.pillars.length &&
      content.pillars.every(
        (pillar) =>
          pillar.name.trim() &&
          pillar.description.trim() &&
          Number.isInteger(pillar.percentage) &&
          pillar.percentage > 0 &&
          pillar.percentage <= 100 &&
          pillar.examples.length >= 1 &&
          pillar.examples.length <= 3 &&
          pillar.examples.every((example) => example.trim() && example.length <= 500),
      ),
  );
  const niche = state?.creatorDna.profile.niche.trim() ?? "";
  const canGenerate = Boolean(state?.aiConfigured && niche && brief.goal.trim());
  const latest = state?.versions[0];
  const selected = state?.versions.find((version) => version.version === selectedVersion);
  const approved = state?.versions.find((version) => version.status === "approved");
  const hasSuggestion = Boolean(
    content.positioning.trim() || content.tone.trim() || content.audience.trim(),
  );
  const visiblePillars = content.pillars.filter((pillar) => pillar.name.trim());
  const goalSuggestionContext = state
    ? JSON.stringify({
        profile: state.creatorDna.profile,
        signals: state.creatorDna.learning.signals.map(({ id }) => id),
      })
    : "";

  const loadGoalSuggestions = useCallback(
    async (force = false) => {
      if (!state?.aiConfigured || !niche || !goalSuggestionContext) {
        return;
      }
      if (!force && requestedGoalContext.current === goalSuggestionContext) {
        return;
      }

      requestedGoalContext.current = goalSuggestionContext;
      const requestId = goalSuggestionRequestId.current + 1;
      goalSuggestionRequestId.current = requestId;
      setGoalSuggestions([]);
      setGoalSuggestionsError("");
      setGoalSuggestionsLoading(true);
      try {
        const result = await generateDirectionGoalSuggestions();
        if (goalSuggestionRequestId.current === requestId) {
          setGoalSuggestions(result.suggestions);
        }
      } catch (requestError) {
        if (goalSuggestionRequestId.current === requestId) {
          setGoalSuggestionsError(
            requestError instanceof Error
              ? requestError.message
              : "Emsen chưa tạo được gợi ý mục tiêu.",
          );
        }
      } finally {
        if (goalSuggestionRequestId.current === requestId) {
          setGoalSuggestionsLoading(false);
        }
      }
    },
    [goalSuggestionContext, niche, state?.aiConfigured],
  );

  useEffect(() => {
    if (active) {
      void loadGoalSuggestions();
    }
  }, [active, loadGoalSuggestions]);

  const regenerate = (section: DirectionSection | "all") => {
    void direction.run("generate", section);
  };

  const guideMessage = goalSuggestionsLoading
    ? "Mình đang đọc Creator DNA để chuẩn bị 3 mục tiêu phù hợp riêng với bạn. Chờ mình một chút nhé."
    : !niche
      ? "Mình chưa biết chủ đề chính của bạn. Hãy bổ sung Creator DNA trước, mình sẽ đề xuất sát với bạn hơn."
      : !brief.goal.trim() && goalSuggestionsError
        ? "Mình chưa tạo được gợi ý lúc này. Bạn có thể thử lại hoặc viết mục tiêu bằng lời của mình."
        : !brief.goal.trim()
          ? "Bạn chỉ cần chọn một mục tiêu cho kênh bên dưới mà Emsen đã gợi ý hoặc chỉnh lại theo cách của mình."
          : !hasSuggestion && !state?.aiConfigured
            ? "AI chưa sẵn sàng, nhưng bạn vẫn có thể mở phần điều chỉnh nâng cao và điền từng mục theo hướng dẫn của mình."
            : !hasSuggestion
              ? "Mục tiêu đã rõ rồi. Bấm “Để Emsen đề xuất” và mình sẽ chuẩn bị một hướng đi hoàn chỉnh cho bạn."
              : valid
                ? "Bản định hướng đã đủ các phần quan trọng. Bạn chỉ cần đọc bản tóm tắt và chốt nếu thấy đúng với mình."
                : "Bản hiện tại còn vài chỗ cần hoàn thiện. Mở phần điều chỉnh nâng cao, mình đã chia nhỏ từng mục để bạn dễ sửa.";
  const guideAvatar: { activity: AvatarActivity } | { emotion: AvatarEmotion } =
    goalSuggestionsLoading
      ? { activity: "working" }
      : !niche
        ? { activity: "waving" }
        : !brief.goal.trim()
          ? goalSuggestions.length
            ? { activity: "idea" }
            : { emotion: "wonder" }
          : !hasSuggestion
            ? { activity: "idea" }
            : valid
              ? { activity: "checklist" }
              : { emotion: "wonder" };

  return (
    <section className="mx-auto max-w-5xl space-y-4" hidden={!active}>
      <header className="relative overflow-hidden rounded-[24px] border border-[#DDEBD6] bg-gradient-to-br from-white via-[#FFF9F5] to-[#F1F7ED] px-5 py-5 sm:px-6">
        <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full border-[24px] border-[#82C95B]/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#467E43]">
              <Compass size={15} /> Bước 02 · Định hướng sáng tạo
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#284D31] sm:text-[28px]">
              Chọn một hướng đi để bắt đầu
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#607760]">
              Bạn nói điều mình muốn đạt được, Emsen sẽ giúp biến nó thành định hướng rõ ràng.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white bg-white/75 p-1.5 text-[11px] font-bold text-[#6D806C] shadow-sm">
            {["DNA", "Định hướng", "Kế hoạch"].map((label, index) => (
              <span
                className={`rounded-full px-2.5 py-1.5 ${
                  index === 1 ? "bg-[#284D31] text-white" : "hidden sm:inline"
                }`}
                key={label}
              >
                {index + 1}. {label}
              </span>
            ))}
          </div>
        </div>
      </header>

      {error ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F3C9C6] bg-[#FFF6F5] p-4 text-sm text-[#A04449]"
          role="alert"
        >
          {error}
          <button
            className="shrink-0 rounded-lg border border-[#E0A8A4] px-3 py-1.5 font-bold"
            disabled={locked}
            onClick={direction.reload}
            type="button"
          >
            Tải lại
          </button>
        </div>
      ) : null}
      {notice ? (
        <p
          className="rounded-2xl border border-[#D4E4CD] bg-[#F2F8ED] p-4 text-sm text-[#487D50]"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {loading && !state ? (
        <p className="flex items-center gap-2 p-8 text-sm" role="status">
          <LoaderCircle className="animate-spin" size={20} /> Đang mở định hướng của bạn…
        </p>
      ) : null}

      {state ? (
        <>
          <section className="rounded-[22px] border border-[#D9E9D3] bg-[#F5FAF1] p-4 sm:flex sm:items-center sm:gap-4 sm:p-5">
            <div className="relative mx-auto w-fit shrink-0 sm:mx-0">
              <span className="absolute inset-1 rounded-full bg-[#CFE9C3] blur-md" />
              <EmsenAvatar
                {...guideAvatar}
                alt="Emsen đang hướng dẫn bạn"
                className="relative h-20 w-20"
              />
              <span className="absolute -right-1 top-0 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[#46A82D] text-white">
                <Sparkles size={12} />
              </span>
            </div>
            <div className="mt-3 min-w-0 flex-1 text-center sm:mt-0 sm:text-left">
              <p className="text-xs font-bold text-[#3E7A3D]">Emsen đồng hành cùng bạn</p>
              <p className="mt-1 text-sm leading-6 text-[#526952]">{guideMessage}</p>
            </div>
            {!niche ? (
              <button
                className="mx-auto mt-3 flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#3E7A3D] shadow-sm sm:mx-0 sm:mt-0"
                onClick={onOpenDna}
                type="button"
              >
                Bổ sung Creator DNA <ArrowRight size={14} />
              </button>
            ) : null}
          </section>

          <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF6E4] text-[#3F7D3D]">
                <Target size={19} />
              </span>
              <div>
                <h3 className="font-bold text-[#284D31]">Bạn muốn kênh này giúp mình điều gì?</h3>
                <p className="mt-1 text-xs leading-5 text-[#748A74]">
                  Chọn một gợi ý hoặc viết tự nhiên như khi bạn nói chuyện với một người bạn.
                </p>
              </div>
            </div>

            <fieldset className="mt-4" disabled={locked}>
              <textarea
                aria-label="Mục tiêu của kênh"
                className={`${directionInputClass} mt-0 min-h-24 resize-y`}
                maxLength={1000}
                onChange={(event) => direction.editBrief({ ...brief, goal: event.target.value })}
                placeholder="Ví dụ: Mình muốn chia sẻ kiến thức làm bánh để người mới có thể tự tin bắt đầu tại nhà."
                rows={3}
                value={brief.goal}
              />
              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6D836C]">
                    <Sparkles size={13} /> 3 gợi ý riêng từ Creator DNA của bạn
                  </p>
                  {goalSuggestions.length ? (
                    <button
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3F7D3D] hover:text-[#46A82D]"
                      onClick={() => void loadGoalSuggestions(true)}
                      type="button"
                    >
                      <RefreshCw size={12} /> Gợi ý khác
                    </button>
                  ) : null}
                </div>
                {goalSuggestionsLoading ? (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F5FAF1] px-3 py-3 text-xs text-[#607760]">
                    <LoaderCircle className="animate-spin text-[#46A82D]" size={15} />
                    Emsen đang đọc thông tin của bạn để chuẩn bị 3 lựa chọn…
                  </div>
                ) : null}
                {!goalSuggestionsLoading && goalSuggestions.length ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {goalSuggestions.map((goal) => {
                      const selectedGoal = brief.goal.trim() === goal.value;
                      return (
                        <button
                          aria-pressed={selectedGoal}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            selectedGoal
                              ? "border-[#46A82D] bg-[#EAF6E4] shadow-sm"
                              : "border-[#D8E8D2] bg-[#FAFCF8] hover:border-[#82C95B] hover:bg-[#EFF8E9]"
                          }`}
                          key={goal.label}
                          onClick={() => direction.editBrief({ ...brief, goal: goal.value })}
                          type="button"
                        >
                          <span className="block text-xs font-bold text-[#31583A]">{goal.label}</span>
                          <span className="mt-1.5 line-clamp-2 block text-[11px] leading-5 text-[#748A74]">
                            {goal.value}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {!goalSuggestionsLoading && goalSuggestionsError ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFF7EE] px-3 py-2.5 text-xs text-[#8A6743]">
                    <span>{goalSuggestionsError}</span>
                    <button
                      className="font-bold text-[#3F7D3D]"
                      onClick={() => void loadGoalSuggestions(true)}
                      type="button"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : null}
                {!goalSuggestionsLoading && !goalSuggestions.length && !goalSuggestionsError ? (
                  <p className="mt-2 text-[11px] leading-5 text-[#829782]">
                    {!niche
                      ? "Bổ sung chủ đề trong Creator DNA để Emsen tạo gợi ý riêng."
                      : !state.aiConfigured
                        ? "Kết nối AI trong Cài đặt để nhận gợi ý mục tiêu cá nhân hóa."
                        : "Bạn vẫn có thể tự viết mục tiêu theo cách của mình."}
                  </p>
                ) : null}
              </div>
            </fieldset>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#E8F0E4] pt-5">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#284D31] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(40,77,49,0.16)] transition hover:-translate-y-0.5 hover:bg-[#376641] disabled:translate-y-0 disabled:opacity-40"
                disabled={locked || goalSuggestionsLoading || !canGenerate}
                onClick={() => regenerate("all")}
                type="button"
              >
                {busy === "all" ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <Sparkles size={17} />
                )}
                {latest ? "Đề xuất một hướng khác" : "Để Emsen đề xuất"}
              </button>
              <p className="max-w-md text-xs leading-5 text-[#748A74]">
                {!state.aiConfigured
                  ? "AI chưa sẵn sàng. Bạn vẫn có thể mở phần nâng cao để tự điền."
                  : !niche
                    ? "Cần có chủ đề trong Creator DNA trước khi Emsen đề xuất."
                    : !brief.goal.trim()
                      ? "Hãy chọn hoặc viết một mục tiêu trước."
                      : "Emsen sẽ dùng Creator DNA để tạo một bản nháp, bạn luôn là người quyết định cuối cùng."}
              </p>
            </div>
          </section>

          {selected && selected.version !== latest?.version ? (
            <p className="rounded-2xl bg-[#FFF3DD] p-4 text-sm text-[#846432]">
              Bạn đang xem phiên bản {selected.version}. Nếu lưu hoặc chốt, một phiên bản mới sẽ
              được tạo từ nội dung này.
            </p>
          ) : null}

          <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#3F7D3D]">
                  <Lightbulb size={15} /> Bản định hướng của bạn
                </p>
                <h3 className="mt-1 text-xl font-bold text-[#284D31]">
                  {hasSuggestion ? "Một hướng đi rõ ràng, vừa đủ để bắt đầu" : "Chưa có bản đề xuất"}
                </h3>
              </div>
              <span className="rounded-full bg-[#F3F7F0] px-3 py-1.5 text-[11px] font-bold text-[#607760]">
                {dirty
                  ? "Có thay đổi chưa lưu"
                  : selected
                    ? `Bản ${selected.version} · ${selected.status === "approved" ? "Đã chốt" : "Bản nháp"}`
                    : "Bản mới"}
              </span>
            </div>

            <div className={`mt-5 grid gap-3 ${compact ? "" : "md:grid-cols-3"}`}>
              <SummaryItem label="Bạn được nhớ đến vì" value={content.positioning} />
              <SummaryItem label="Bạn sẽ trò chuyện như" value={content.tone} />
              <SummaryItem label="Bạn đang nói với" value={content.audience} />
            </div>

            <div className="mt-4 rounded-2xl border border-[#E2EDE0] bg-[#FAFCF8] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#526952]">Những nhóm nội dung chính</p>
                <span
                  className={`text-[11px] font-bold ${total === 100 ? "text-[#487D50]" : "text-[#A56743]"}`}
                >
                  Tổng {total}%
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {visiblePillars.length ? (
                  visiblePillars.map((pillar, index) => (
                    <span
                      className="rounded-full border border-[#D9E8D4] bg-white px-3 py-1.5 text-xs font-semibold text-[#526952]"
                      key={`${pillar.name}-${index}`}
                    >
                      {pillar.name} · {pillar.percentage}%
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[#829782]">
                    Emsen sẽ chia nội dung thành 3–5 nhóm dễ triển khai.
                  </p>
                )}
              </div>
            </div>

            {!valid && hasSuggestion ? (
              <p className="mt-4 rounded-xl bg-[#FFF8EA] px-4 py-3 text-xs leading-5 text-[#866531]">
                Bản này còn thiếu một vài chi tiết hoặc tổng tỷ lệ chưa bằng 100%. Mở phần nâng cao
                để xem mục cần chỉnh.
              </p>
            ) : null}

            {busy ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-[#467E43]" role="status">
                <LoaderCircle className="animate-spin" size={16} />
                {busy === "draft" || busy === "approved"
                  ? "Đang lưu định hướng…"
                  : "Emsen đang chuẩn bị một hướng đi phù hợp với bạn…"}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#E8F0E4] pt-5">
              <button
                aria-expanded={advancedOpen}
                className="inline-flex items-center gap-2 rounded-xl border border-[#C8DBC1] px-4 py-3 text-sm font-bold text-[#466A49] transition hover:bg-[#F3F8F0]"
                onClick={() => setAdvancedOpen((current) => !current)}
                type="button"
              >
                <SlidersHorizontal size={16} />
                {advancedOpen ? "Thu gọn điều chỉnh" : "Điều chỉnh nâng cao"}
                <ChevronDown
                  className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                  size={15}
                />
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-[#C8DBC1] px-4 py-3 text-sm font-bold disabled:opacity-40"
                disabled={locked || !valid}
                onClick={() => void direction.run("draft")}
                type="button"
              >
                <Save size={17} /> Lưu bản nháp
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#527F56] px-5 py-3 text-sm font-bold text-white hover:bg-[#426947] disabled:opacity-40"
                disabled={
                  locked ||
                  !valid ||
                  (!dirty && selected?.status === "approved" && selected.version === latest?.version)
                }
                onClick={() => void direction.run("approved")}
                type="button"
              >
                <Check size={17} /> Chốt hướng đi này
              </button>
              {approved ? (
                <button
                  className="inline-flex items-center gap-1 text-sm font-bold text-[#3F8240]"
                  onClick={onContentPlan}
                  type="button"
                >
                  Sang kế hoạch nội dung <ArrowRight size={15} />
                </button>
              ) : null}
            </div>
          </section>

          {advancedOpen ? (
            <section className="space-y-4 rounded-[26px] border border-[#CFE1C8] bg-[#F7FAF5] p-4 sm:p-5">
              <div className="flex items-start gap-3 px-1 py-1">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#487D50] shadow-sm">
                  <SlidersHorizontal size={17} />
                </span>
                <div>
                  <h3 className="font-bold text-[#284D31]">Điều chỉnh nâng cao</h3>
                  <p className="mt-1 text-xs leading-5 text-[#748A74]">
                    Chỉ cần mở mục bạn muốn sửa. Nếu chưa chắc, bạn có thể giữ nguyên đề xuất của
                    Emsen.
                  </p>
                </div>
              </div>

              <fieldset className="rounded-[20px] border border-[#DDEBD6] bg-white p-5" disabled={locked}>
                <label className="block text-xs font-bold text-[#526952]">
                  Mong muốn hoặc giới hạn thêm{" "}
                  <span className="font-normal text-[#829782]">· Không bắt buộc</span>
                  <textarea
                    className={directionInputClass}
                    maxLength={4000}
                    onChange={(event) => direction.editBrief({ ...brief, notes: event.target.value })}
                    placeholder="Ví dụ: Mình chỉ có thể quay bằng điện thoại, không muốn nội dung quá bán hàng…"
                    rows={2}
                    value={brief.notes}
                  />
                </label>
              </fieldset>

              {fields.map((field) => (
                <DirectionField
                  canGenerate={canGenerate && valid}
                  disabled={locked}
                  hint={field.hint}
                  key={field.key}
                  onChange={(value) => direction.editContent({ ...content, [field.key]: value })}
                  onRegenerate={() => regenerate(field.key)}
                  title={field.title}
                  value={content[field.key]}
                />
              ))}

              <ContentPillarsEditor
                canGenerate={canGenerate && valid}
                disabled={locked}
                onChange={(pillars) => direction.editContent({ ...content, pillars })}
                onRegenerate={() => regenerate("pillars")}
                pillars={content.pillars}
              />

              <DirectionContext onOpenDna={onOpenDna} state={state} />
            </section>
          ) : null}

          <DirectionHistory
            approved={approved}
            locked={locked}
            onReload={direction.reload}
            onSelect={direction.selectVersion}
            selectedVersion={selectedVersion}
            state={state}
          />
        </>
      ) : null}
    </section>
  );
}
