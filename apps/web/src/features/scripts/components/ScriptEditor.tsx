import { useEffect, useState } from "react";
import type {
  ScriptAssistSection,
  ScriptAssistResponseDto,
  ScriptDocumentDto,
  ScriptReferenceAssetDto,
  ScriptStoryboardFrameDto,
} from "@creator-flow/contracts";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Clock3,
  Download,
  FileJson,
  Film,
  FolderKanban,
  Link2,
  LoaderCircle,
  Mic2,
  PencilLine,
  Plus,
  Quote,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { EmsenAvatar } from "../../../components/branding/EmsenAvatar";
import { AiProgressStatus } from "../../../components/feedback/AiProgressStatus";
import { downloadScript, scriptAsText } from "../scriptExport";
import { formatScriptDate, scriptStatusConfig, scriptStatuses, scriptSyncFieldLabels } from "../scriptConfig";
import { countScriptWords, recommendedScriptWords, scriptDurationPresets } from "../scriptDuration";
import { parseTimelineText, serializeTimelineText } from "../scriptTimeline";

const inputClass = "mt-2 w-full rounded-xl border border-[#E6D4CE] bg-[#FFFDF8] px-3 py-2.5 text-sm font-normal leading-6 text-[#31583A] outline-none transition focus:border-[#72B65D] focus:ring-2 focus:ring-[#DDEED6]";
const storyboardGuideStorageKey = "emsen:storyboard-guide-seen";

const supportedReferenceMedia = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

function referenceMimeType(file: File) {
  if (supportedReferenceMedia.has(file.type)) return file.type;
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (extension === "mov") return "video/quicktime";
  if (extension === "mp4") return "video/mp4";
  if (extension === "webm") return "video/webm";
  return file.type;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Không thể đọc ${file.name}.`));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

function AiPrompt({
  section,
  busy,
  enabled,
  currentValue,
  onAsk,
  onApplyAlternative,
  onClose,
  onSettings,
}: {
  section: ScriptAssistSection;
  busy: boolean;
  enabled: boolean;
  currentValue?: string;
  onAsk: (
    prompt: string,
    referenceAssets?: ScriptReferenceAssetDto[],
  ) => Promise<ScriptAssistResponseDto | null>;
  onApplyAlternative?: (value: string) => void;
  onClose: () => void;
  onSettings: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [scopeExcerpt, setScopeExcerpt] = useState("");
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceText, setReferenceText] = useState("");
  const [referenceAssets, setReferenceAssets] = useState<ScriptReferenceAssetDto[]>([]);
  const [referenceError, setReferenceError] = useState("");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const suggestions: Record<ScriptAssistSection, string[]> = {
    hook: [
      "Rút Hook ngắn hơn",
      "Mở đầu tự nhiên hơn",
      "Mở bằng một tuyên bố bất ngờ nhưng có thật",
      "Đặt câu hỏi khiến người xem thấy mình trong đó",
      "Mở từ một trải nghiệm thật",
      "Hứa hẹn một mẹo cụ thể",
      "Mở bằng một quan điểm khác biệt",
    ],
    body: [
      "Giữ phần mình thích và phát triển thêm",
      "Chỉ ra phần chưa ổn và cùng mình sửa",
      "Làm nội dung rõ ý và logic hơn",
      "Thêm chi tiết để câu chuyện thuyết phục hơn",
      "Làm lời thoại tự nhiên hơn",
      "Rút gọn những phần chưa cần thiết",
    ],
    cta: [],
    storyboard: [
      "Mỗi cảnh cần mục đích thị giác rõ",
      "Thêm B-roll và chuyển cảnh giữ chân",
      "Đơn giản hóa để quay bằng điện thoại",
    ],
  };
  const ctaGoals = [
    "Bình luận / chia sẻ quan điểm",
    "Theo dõi để xem thêm nội dung",
    "Lưu lại để xem sau",
    "Chia sẻ cho người khác",
    "Xem phần / video tiếp theo",
    "Inbox hoặc tìm hiểu thêm",
    "Click link / đăng ký / mua hàng",
    "Không cần CTA trực tiếp",
  ];
  const sectionLabel = section === "hook" ? "Hook" : section === "body" ? "Nội dung" : section === "cta" ? "CTA" : "Storyboard";

  const addReferenceFiles = async (files: FileList) => {
    setReferenceError("");
    const incoming = [...files];
    const textFiles = incoming.filter((file) => file.type.startsWith("text/") || /\.(md|txt|srt)$/i.test(file.name));
    const mediaFiles = incoming.filter((file) => !textFiles.includes(file));
    if (referenceAssets.length + mediaFiles.length > 3) {
      setReferenceError("Mỗi lượt nhận tối đa 3 ảnh hoặc video tham chiếu.");
      return;
    }
    const totalBytes = referenceAssets.reduce(
      (total, asset) => total + Math.ceil(asset.dataBase64.length * 0.75),
      0,
    ) + mediaFiles.reduce((total, file) => total + file.size, 0);
    if (totalBytes > 4 * 1024 * 1024) {
      setReferenceError("Tổng ảnh và video tham chiếu cần nhỏ hơn 4 MB.");
      return;
    }
    const unsupported = mediaFiles.find((file) => !supportedReferenceMedia.has(referenceMimeType(file)));
    if (unsupported) {
      setReferenceError(`Chưa hỗ trợ ${unsupported.name}. Hãy dùng ảnh, MP4, MOV, WEBM hoặc tệp TXT/MD/SRT.`);
      return;
    }
    try {
      const textParts = await Promise.all(textFiles.map((file) => file.text()));
      if (textParts.length) {
        setReferenceText((current) => [current, ...textParts].filter(Boolean).join("\n\n").slice(0, 1_800));
      }
      const nextAssets = await Promise.all(mediaFiles.map(async (file) => ({
        dataBase64: await readFileAsBase64(file),
        mimeType: referenceMimeType(file),
        name: file.name,
      })));
      setReferenceAssets((current) => [...current, ...nextAssets]);
    } catch (error) {
      setReferenceError(error instanceof Error ? error.message : "Chưa thể đọc tệp tham chiếu.");
    }
  };

  const ask = async () => {
    const request = [
      `Chỉ chỉnh phần ${sectionLabel}; giữ nguyên mọi phần khác của kịch bản.`,
      scopeExcerpt.trim()
        ? `Phạm vi được phép xử lý:\n${scopeExcerpt.trim()}\nGiữ nguyên nội dung nằm ngoài phạm vi này.`
        : "Nếu yêu cầu còn mơ hồ, ưu tiên giữ nguyên những ý và câu đã có; chỉ thay đổi tối thiểu cần thiết.",
      prompt.trim(),
      referenceText.trim() ? `Mẫu tham chiếu do người dùng cung cấp:\n${referenceText.trim()}` : "",
    ].filter(Boolean).join("\n\n").slice(0, 3_000);
    if (!request.trim()) return;
    const result = await onAsk(request, referenceAssets);
    setAlternatives(result?.alternatives ?? []);
  };

  const canAsk = Boolean(
    prompt.trim() || scopeExcerpt.trim() || referenceText.trim() || referenceAssets.length,
  );

  return (
    <aside className="mt-3 rounded-2xl border border-[#CFE3C8] bg-[#F4FAF0] p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <EmsenAvatar activity="idea" className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-bold text-[#3F8240]"><Bot size={14} /> {section === "storyboard" ? "Cùng Emsen chia cảnh quay" : "Cùng Emsen hoàn thiện kịch bản nhé"}</p>
          <p className="mt-0.5 text-[11px] text-[#748A74]">{section === "storyboard" ? "Chọn cách bạn muốn hình dung cảnh quay." : "Bạn muốn giữ lại, thay đổi hay phát triển thêm điều gì ở phiên bản này?"}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng trợ lý" className="rounded-lg p-1.5 text-[#748A74] hover:bg-white"><X size={15} /></button>
      </div>

      {enabled ? (
        <div className="mt-3">
          {section === "cta" ? (
            <div>
              <p className="text-xs font-bold text-[#31583A]">Bạn muốn người xem làm gì sau khi xem video này?</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ctaGoals.map((goal) => <button key={goal} type="button" onClick={() => setPrompt(`Mục tiêu CTA: ${goal}. Hãy đề xuất 3 cách diễn đạt CTA khác nhau, tự nhiên và phù hợp với nội dung, tone và mạch cảm xúc của video.`)} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${prompt.includes(`Mục tiêu CTA: ${goal}.`) ? "border-[#72B65D] bg-[#EAF6E4] text-[#31583A]" : "border-[#D6E5D1] bg-white text-[#557058] hover:border-[#8ABA7A]"}`}>{goal}</button>)}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {suggestions[section].map((suggestion) => <button key={suggestion} type="button" onClick={() => { setPrompt(suggestion); setAlternatives([]); }} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${prompt === suggestion ? "border-[#72B65D] bg-[#EAF6E4] text-[#31583A]" : "border-[#D6E5D1] bg-white text-[#557058] hover:border-[#8ABA7A]"}`}>{suggestion}</button>)}
            </div>
          )}

          {section === "hook" ? (
            <div className="mt-3 rounded-xl border border-[#DCE8D7] bg-white p-3">
              <button type="button" onClick={() => { setReferenceOpen((value) => !value); setPrompt((current) => current || "Viết Hook theo kỹ thuật của mẫu tham chiếu, nhưng giữ nguyên thông điệp và không sao chép nguyên văn."); }} className="flex w-full items-center gap-2 text-left text-xs font-bold text-[#3F8240]"><Quote size={14} /> Viết theo mẫu tham chiếu <ChevronDown className={`ml-auto transition ${referenceOpen ? "rotate-180" : ""}`} size={14} /></button>
              {referenceOpen ? <div className="mt-3 space-y-2.5 border-t border-[#EDF2EA] pt-3">
                <textarea value={referenceText} onChange={(event) => setReferenceText(event.target.value.slice(0, 1_800))} rows={3} placeholder="Dán đoạn Hook hoặc kịch bản bạn muốn dùng làm tham chiếu…" className="w-full resize-y rounded-xl border border-[#D9E4D3] px-3 py-2 text-xs leading-5 outline-none focus:border-[#72B65D]" />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#C8DBC1] px-3 py-2 text-[11px] font-bold text-[#3F8240]"><Upload size={14} /> Tải ảnh, script hoặc video<input hidden multiple type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm,.txt,.md,.srt" onChange={(event) => { if (event.target.files) void addReferenceFiles(event.target.files); event.target.value = ""; }} /></label>
                  <span className="text-[10px] text-[#879487]">Tối đa 3 tệp, tổng dưới 4 MB</span>
                </div>
                {referenceAssets.length ? <div className="flex flex-wrap gap-1.5">{referenceAssets.map((asset, index) => <button key={`${asset.name}-${index}`} type="button" onClick={() => setReferenceAssets((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-1 rounded-full bg-[#EEF6EB] px-2.5 py-1 text-[10px] font-bold text-[#557058]">{asset.name}<X size={11} /></button>)}</div> : null}
                {referenceError ? <p className="text-[11px] font-semibold text-[#A15B55]">{referenceError}</p> : null}
              </div> : null}
            </div>
          ) : null}

          {section !== "storyboard" ? (
            <details className="mt-3 rounded-xl border border-[#DCE8D7] bg-white">
              <summary className="cursor-pointer list-none px-3 py-2.5 text-[11px] font-bold text-[#557058]">Phạm vi được phép chỉnh · nên chọn khi chỉ muốn sửa một đoạn</summary>
              <div className="border-t border-[#EDF2EA] p-3">
                <textarea value={scopeExcerpt} onChange={(event) => setScopeExcerpt(event.target.value)} rows={2} maxLength={900} placeholder={currentValue ? "Dán câu hoặc đoạn được phép chỉnh vào đây. Phần còn lại sẽ được giữ nguyên." : "Mô tả cảnh hoặc phạm vi được phép chỉnh…"} className="w-full resize-y rounded-xl border border-[#D9E4D3] px-3 py-2 text-xs leading-5 outline-none focus:border-[#72B65D]" />
              </div>
            </details>
          ) : null}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={3000}
              rows={2}
              placeholder="Bạn muốn chỉnh theo cách khác? Nói cho mình biết nhé…"
              className="min-w-0 flex-1 resize-none rounded-xl border border-[#D9E4D3] bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-[#72B65D]"
            />
            <button type="button" disabled={busy || !canAsk} onClick={() => void ask()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#31583A] px-3.5 py-2.5 text-xs font-bold text-white disabled:opacity-40">
              {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {busy ? "Đang chỉnh" : "Gửi Emsen"}
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[#748A74]">Emsen chỉ cập nhật phần {sectionLabel}; Hook, Nội dung, CTA và Storyboard còn lại được giữ nguyên.</p>
          {alternatives.length ? (
            <div className="mt-3 rounded-2xl border border-[#D9E8D4] bg-white p-3">
              <p className="text-xs font-bold text-[#31583A]">Chọn một cách diễn đạt CTA</p>
              <div className="mt-2 space-y-2">
                {alternatives.map((alternative, index) => (
                  <button key={`${alternative}-${index}`} type="button" onClick={() => { onApplyAlternative?.(alternative); setAlternatives([]); }} className="block w-full rounded-xl border border-[#E1E9DD] bg-[#FFFDF9] p-3 text-left text-xs leading-5 text-[#526952] hover:border-[#8ABA7A]">
                    <strong className="mr-1 text-[#3F8240]">Cách {index + 1}:</strong> {alternative}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <button type="button" onClick={onSettings} className="mt-3 rounded-xl border border-[#C8DBC1] bg-white px-3 py-2 text-xs font-bold text-[#3F8240]">Kết nối AI để dùng</button>
      )}
    </aside>
  );
}

const deliveryPrefixPattern = /^\s*\[(?:Nói trực tiếp|Thoại trực tiếp|Voice[- ]?over|Lồng tiếng)\]\s*/iu;

function deliveryMode(value: string): "Nói trực tiếp" | "Voice-over" | null {
  const match = value.match(/^\s*\[(Nói trực tiếp|Thoại trực tiếp|Voice[- ]?over|Lồng tiếng)\]/iu)?.[1]?.toLocaleLowerCase("vi-VN");
  if (!match) return null;
  return match.includes("voice") || match.includes("lồng") ? "Voice-over" : "Nói trực tiếp";
}

function withDeliveryMode(value: string, mode: "Nói trực tiếp" | "Voice-over") {
  return `[${mode}] ${value.replace(deliveryPrefixPattern, "").trimStart()}`;
}

function extractHighlightPhrase(value: string) {
  const clean = value.replace(deliveryPrefixPattern, "").trim();
  if (!clean) return "";
  const clauses = clean
    .split(/(?<=[.!?])\s+|[;\n]+/u)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const cuePattern = /(?:điều quan trọng|thực ra|lý do|bài học|kết quả|chỉ khi|đừng|hãy|không phải|nhưng)/iu;
  const ranked = clauses.sort((left, right) => {
    const score = (clause: string) =>
      (cuePattern.test(clause) ? 20 : 0) +
      (/\d/u.test(clause) ? 5 : 0) +
      Math.min(12, clause.split(/\s+/u).length);
    return score(right) - score(left);
  });
  const candidate = ranked[0] ?? clean;
  const words = candidate.split(/\s+/u);
  if (words.length < 3) return "";
  return words.slice(0, Math.min(9, words.length)).join(" ").replace(/[,.!?;:]+$/u, "");
}

function HighlightedLine({ value }: { value: string }) {
  const phrase = extractHighlightPhrase(value);
  if (!phrase) return <>{value}</>;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(${escaped})`, "giu");
  return (
    <>
      {value.split(matcher).map((part, index) =>
        part.toLocaleLowerCase("vi-VN") === phrase.toLocaleLowerCase("vi-VN") ? (
          <mark
            className="rounded bg-[#FFE49A] px-0.5 font-bold text-[#31583A]"
            key={`${part}-${index}`}
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function ScriptLineEditor({
  ariaLabel,
  highlight,
  onChange,
  placeholder,
  rows,
  value,
}: {
  ariaLabel: string;
  highlight: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  value: string;
}) {
  const [editing, setEditing] = useState(false);
  const mode = deliveryMode(value);
  const spokenText = value.replace(deliveryPrefixPattern, "");
  const updateSpokenText = (nextValue: string) => {
    onChange(mode ? withDeliveryMode(nextValue, mode) : nextValue);
  };

  if (editing) {
    return (
      <textarea
        aria-label={ariaLabel}
        autoFocus
        className="min-h-[58px] w-full resize-y rounded-xl border border-[#A9C99D] bg-white px-3 py-2 text-sm font-normal leading-6 text-[#31583A] outline-none ring-2 ring-[#E3F0DE]"
        onBlur={() => setEditing(false)}
        onChange={(event) => updateSpokenText(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={spokenText}
      />
    );
  }

  return (
    <button
      aria-label={`Chỉnh ${ariaLabel.toLocaleLowerCase("vi-VN")}`}
      className="group/line min-h-[58px] w-full rounded-xl border border-transparent bg-[#FFFDF9] px-3 py-2 text-left transition hover:border-[#D5E5CF] hover:bg-white"
      onClick={() => setEditing(true)}
      type="button"
    >
      <span className="block whitespace-pre-wrap text-sm font-normal leading-6 text-[#31583A]">
        {spokenText.trim() ? (
          highlight ? <HighlightedLine value={spokenText} /> : spokenText
        ) : (
          <span className="text-[#A3AAA1]">{placeholder}</span>
        )}
      </span>
      <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-[#8A9A87] opacity-0 transition group-hover/line:opacity-100 group-focus/line:opacity-100">
        <PencilLine size={10} /> Nhấn để chỉnh lời thoại
      </span>
    </button>
  );
}

function TextSection({
  number,
  title,
  value,
  rows,
  placeholder,
  section,
  busy,
  aiConfigured,
  onChange,
  onAssist,
  onSettings,
}: {
  number: number;
  title: string;
  value: string;
  rows: number;
  placeholder: string;
  section: Exclude<ScriptAssistSection, "storyboard">;
  busy: boolean;
  aiConfigured: boolean;
  onChange: (value: string) => void;
  onAssist: (
    section: ScriptAssistSection,
    prompt: string,
    referenceAssets?: ScriptReferenceAssetDto[],
  ) => Promise<ScriptAssistResponseDto | null>;
  onSettings: () => void;
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const words = countScriptWords([value]);
  const timelineSegments = parseTimelineText(value);
  const updateTimelineSegment = (index: number, text: string) => {
    onChange(serializeTimelineText(timelineSegments.map((segment, segmentIndex) =>
      segmentIndex === index ? { ...segment, text } : segment,
    )));
  };
  const textareaClass = "w-full resize-y rounded-2xl border border-[#E8DED8] bg-[#FFFDF9] px-4 py-3 text-sm font-normal leading-6 text-[#31583A] outline-none transition placeholder:text-[#A3AAA1] focus:border-[#72B65D] focus:ring-2 focus:ring-[#DDEED6]";

  return (
    <section className="rounded-[22px] border border-[#DDEBD6] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black ${value.trim() ? "bg-[#EAF6E4] text-[#3F8240]" : "bg-[#F2EEE9] text-[#8A7E73]"}`}>
          {value.trim() ? <Check size={15} strokeWidth={3} /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#284D31]">{title}</h3>
          <p className="text-[11px] text-[#879487]">{words ? `${words} từ` : "Chưa viết"}</p>
        </div>
        <button
          type="button"
          aria-expanded={assistantOpen}
          onClick={() => setAssistantOpen((value) => !value)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${assistantOpen ? "bg-[#EAF6E4] text-[#31583A]" : "border border-[#D7E5D1] text-[#3F8240] hover:bg-[#F4FAF0]"}`}
        >
          <Sparkles size={14} /> <span className="hidden sm:inline">Nhờ Emsen</span>
        </button>
      </div>
      {timelineSegments.length > 0 ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#D8E8D2] bg-gradient-to-br from-[#F9FCF7] via-white to-[#FBF7FC]">
          <div className="flex items-center justify-between gap-3 border-b border-[#E2ECE0] bg-white/75 px-3.5 py-2.5">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#537858]">
              <Clock3 size={13} /> Nhịp theo thời gian
            </p>
            <span className="rounded-full bg-[#F1E8F0] px-2.5 py-1 text-[10px] font-bold tabular-nums text-[#815477]">
              {timelineSegments.length} {timelineSegments.length === 1 ? "mốc" : "mốc nội dung"}
            </span>
          </div>
          <div className="space-y-2.5 p-3">
            {timelineSegments.map((segment, index) => (
              <div className="grid gap-2 rounded-2xl border border-[#E2E9DE] bg-white p-2.5 shadow-[0_5px_16px_rgba(58,94,60,0.06)] sm:grid-cols-[112px_minmax(0,1fr)]" key={`${segment.label}-${index}`}>
                <div className="flex items-start">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#3E7B49] to-[#70AD5C] px-2.5 py-2 text-[11px] font-black tabular-nums text-white shadow-[0_5px_12px_rgba(62,123,73,0.22)]">
                    <Clock3 size={12} strokeWidth={2.5} /> {segment.label}
                  </span>
                </div>
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#6D836C]">
                      <Sparkles size={10} /> Emsen đề xuất:
                    </span>
                    {(["Nói trực tiếp", "Voice-over"] as const).map((mode) => (
                      <button
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${deliveryMode(segment.text) === mode ? "bg-[#EAF6E4] text-[#31583A]" : "border border-[#E3E8DF] bg-white text-[#879487]"}`}
                        key={mode}
                        onClick={() => updateTimelineSegment(index, withDeliveryMode(segment.text, mode))}
                        type="button"
                      >
                        {mode === "Nói trực tiếp" ? <Mic2 size={10} /> : <Volume2 size={10} />}
                        {mode}
                      </button>
                    ))}
                  </div>
                  <ScriptLineEditor
                    ariaLabel={`${title} ${segment.label}`}
                    highlight={section === "hook" || section === "body"}
                    onChange={(nextValue) => updateTimelineSegment(index, nextValue)}
                    placeholder={placeholder}
                    rows={section === "body" ? 2 : 1}
                    value={segment.text}
                  />
                </div>
              </div>
            ))}
          </div>
          <details className="group border-t border-[#E2ECE0] bg-white/70">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-[10px] font-bold text-[#748A74]">
              Chỉnh trực tiếp lời thoại và mốc thời gian
              <ChevronDown size={13} className="transition group-open:rotate-180" />
            </summary>
            <div className="px-3 pb-3">
              <textarea
                aria-label={`${title} và mốc thời gian`}
                className={textareaClass}
                rows={rows}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
              />
              <p className="mt-1.5 text-[10px] text-[#879487]">Ví dụ định dạng: [0:00–0:05] Lời thoại trong khoảng thời gian này. Mốc thực tế có thể dài hoặc ngắn hơn.</p>
            </div>
          </details>
        </div>
      ) : (
        <>
          <textarea
            aria-label={title}
            className={`mt-3 ${textareaClass}`}
            rows={rows}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
          {value.trim() ? (
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[#879487]"><Clock3 size={12} /> Kịch bản cũ chưa có mốc thời gian; bạn có thể nhờ Emsen chia lại theo thời lượng.</p>
          ) : null}
        </>
      )}
      {assistantOpen && <AiPrompt section={section} busy={busy} currentValue={value} enabled={aiConfigured} onAsk={(prompt, referenceAssets) => onAssist(section, prompt, referenceAssets)} {...(section === "cta" ? { onApplyAlternative: onChange } : {})} onClose={() => setAssistantOpen(false)} onSettings={onSettings} />}
    </section>
  );
}

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Không thể sao chép");
}

export function ScriptEditor({
  draft,
  dirty,
  saving,
  assisting,
  error,
  notice,
  aiConfigured,
  onBack,
  onChange,
  onSave,
  onDelete,
  onAssist,
  onSettings,
  onStartVideo,
}: {
  draft: ScriptDocumentDto;
  dirty: boolean;
  saving: boolean;
  assisting: ScriptAssistSection | null;
  error: string;
  notice: string;
  aiConfigured: boolean;
  onBack: () => void;
  onChange: (next: ScriptDocumentDto) => void;
  onSave: () => void;
  onDelete: () => void;
  onAssist: (
    section: ScriptAssistSection,
    prompt: string,
    referenceAssets?: ScriptReferenceAssetDto[],
  ) => Promise<ScriptAssistResponseDto | null>;
  onSettings: () => void;
  onStartVideo: () => void;
}) {
  const [storyboardAssistantOpen, setStoryboardAssistantOpen] = useState(false);
  const [storyboardRequested, setStoryboardRequested] = useState(draft.content.storyboard.length > 0);
  const [storyboardExplainerOpen, setStoryboardExplainerOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState("");

  useEffect(() => {
    if (notice) setExportNotice("");
  }, [notice]);

  useEffect(() => {
    setStoryboardRequested(draft.content.storyboard.length > 0);
    setStoryboardExplainerOpen(false);
    setStoryboardAssistantOpen(false);
  }, [draft.id]);

  const applyChange = (next: ScriptDocumentDto) => {
    setExportNotice("");
    onChange(next);
  };
  const changeContent = (patch: Partial<ScriptDocumentDto["content"]>) => applyChange({ ...draft, content: { ...draft.content, ...patch } });
  const changeSettings = (patch: Partial<ScriptDocumentDto["settings"]>) => applyChange({ ...draft, settings: { ...draft.settings, ...patch } });
  const changeAdvanced = (patch: Partial<ScriptDocumentDto["advancedSettings"]>) => applyChange({ ...draft, advancedSettings: { ...draft.advancedSettings, ...patch } });
  const changeStrategy = (patch: Partial<ScriptDocumentDto["creativeStrategy"]>) => applyChange({ ...draft, creativeStrategy: { ...draft.creativeStrategy, ...patch } });
  const updateFrame = (id: string, patch: Partial<ScriptStoryboardFrameDto>) => changeContent({ storyboard: draft.content.storyboard.map((frame) => frame.id === id ? { ...frame, ...patch } : frame) });
  const moveFrame = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.content.storyboard.length) return;
    const frames = [...draft.content.storyboard];
    [frames[index], frames[nextIndex]] = [frames[nextIndex]!, frames[index]!];
    changeContent({ storyboard: frames });
  };
  const addFrame = () => changeContent({ storyboard: [...draft.content.storyboard, {
    id: crypto.randomUUID(),
    title: `Keyframe ${String(draft.content.storyboard.length + 1).padStart(2, "0")}`,
    visual: "",
    visualPurpose: "",
    broll: "",
    dialogue: "",
    emotionalBeat: "",
    transition: "",
    retentionRole: "",
    direction: "",
    durationSeconds: 5,
  }] });
  const startStoryboard = async (withEmsen: boolean) => {
    setStoryboardRequested(true);
    setStoryboardExplainerOpen(false);
    window.localStorage.setItem(storyboardGuideStorageKey, "true");
    if (withEmsen && aiConfigured) {
      await onAssist(
        "storyboard",
        "Kịch bản lời thoại đã được chốt. Hãy chuyển đúng phiên bản này thành storyboard dễ quay, ghi rõ thoại trực tiếp hay voice-over cho từng cảnh và không thay đổi thông điệp.",
      );
    } else if (withEmsen) {
      setStoryboardAssistantOpen(true);
    }
  };
  const requestStoryboard = () => {
    if (window.localStorage.getItem(storyboardGuideStorageKey) === "true") {
      void startStoryboard(aiConfigured);
      return;
    }
    setStoryboardExplainerOpen(true);
  };

  const closeExportMenu = (trigger: HTMLElement) => trigger.closest("details")?.removeAttribute("open");
  const exportFile = (format: "txt" | "json", trigger: HTMLElement) => {
    downloadScript(draft, format);
    setExportNotice(format === "txt" ? "Đã tải bản văn bản." : "Đã tải bản dữ liệu để sao lưu.");
    closeExportMenu(trigger);
  };
  const copyScript = async (trigger: HTMLElement) => {
    try {
      const value = scriptAsText(draft);
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else copyWithFallback(value);
      setExportNotice("Đã sao chép toàn bộ kịch bản.");
    } catch {
      setExportNotice("Chưa thể sao chép. Bạn có thể tải tệp văn bản thay thế.");
    }
    closeExportMenu(trigger);
  };

  const status = scriptStatusConfig[draft.status];
  const primarySections = [draft.content.hook, draft.content.body, draft.content.cta];
  const completedSections = primarySections.filter((value) => value.trim()).length;
  const wordCount = countScriptWords(primarySections);
  const wordRange = recommendedScriptWords(draft.settings.targetDurationSeconds);
  const wordCountState = wordCount < wordRange.min ? "short" : wordCount > wordRange.max ? "long" : "balanced";
  const ctaTimeline = parseTimelineText(draft.content.cta);
  const timelineEndSeconds = ctaTimeline.at(-1)?.endSeconds;
  const timelineNeedsUpdate = timelineEndSeconds !== undefined && timelineEndSeconds !== draft.settings.targetDurationSeconds;
  const storyboardDuration = draft.content.storyboard.reduce((total, frame) => total + frame.durationSeconds, 0);
  const planSync = draft.planReference?.sync;
  const appliedSyncLabels = planSync?.appliedFields.map((field) => scriptSyncFieldLabels[field]) ?? [];
  const preservedSyncLabels = planSync?.preservedFields.map((field) => scriptSyncFieldLabels[field]) ?? [];

  return (
    <section className="mx-auto max-w-[1280px] space-y-4">
      <header className="sticky top-0 z-20 rounded-[22px] border border-[#D9E8D4] bg-[rgba(255,254,249,0.96)] p-3 shadow-[0_12px_35px_rgba(55,85,57,0.1)] backdrop-blur-xl sm:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#DDE8D6] bg-white px-3 py-2.5 text-xs font-bold"><ArrowLeft size={15} /> <span className="hidden sm:inline">Thư viện</span></button>
          <div className="min-w-[190px] flex-1">
            <input value={draft.title} maxLength={250} placeholder="Tên kịch bản" onChange={(event) => applyChange({ ...draft, title: event.target.value })} className="w-full bg-transparent text-base font-bold text-[#284D31] outline-none sm:text-xl" />
            <p className="mt-0.5 truncate text-[11px] text-[#748A74]">{draft.settings.platform || "Chưa chọn nền tảng"} · {formatScriptDate(draft.settings.scheduledFor)} · {wordCount} từ / gợi ý {wordRange.min}–{wordRange.max}</p>
          </div>

          <button type="button" disabled={dirty || saving} onClick={onStartVideo} title={dirty ? "Hãy lưu kịch bản trước khi tạo dự án video" : "Tạo dự án dựng từ kịch bản này"} className="inline-flex items-center gap-2 rounded-xl border border-[#C8DBC1] bg-[#F4FAF0] px-3 py-2.5 text-xs font-bold text-[#3F8240] disabled:cursor-not-allowed disabled:opacity-45"><Film size={15} /> <span className="hidden sm:inline">Dựng video</span></button>

          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-[#DDE8D6] bg-white px-3 py-2.5 text-xs font-bold text-[#31583A]"><Download size={15} /> Xuất <ChevronDown size={13} /></summary>
            <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-[#DDE8D6] bg-white p-2 shadow-[0_18px_50px_rgba(48,74,50,0.18)]">
              <button type="button" onClick={(event) => void copyScript(event.currentTarget)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-[#F4FAF0]"><Clipboard size={15} className="text-[#3F8240]" /> Sao chép toàn bộ</button>
              <button type="button" onClick={(event) => exportFile("txt", event.currentTarget)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-[#F4FAF0]"><Download size={15} className="text-[#3F8240]" /> Văn bản (.txt)</button>
              <button type="button" onClick={(event) => exportFile("json", event.currentTarget)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-[#F4FAF0]"><FileJson size={15} className="text-[#8B557D]" /> Bản sao lưu (.json)</button>
            </div>
          </details>

          <button type="button" onClick={onDelete} aria-label="Xóa kịch bản" className="rounded-xl border border-[#F0D5D0] bg-white p-2.5 text-[#A15B55] hover:bg-[#FFF0EC]"><Trash2 size={15} /></button>
          <select value={draft.status} aria-label="Trạng thái kịch bản" onChange={(event) => applyChange({ ...draft, status: event.target.value as ScriptDocumentDto["status"] })} style={{ color: status.color, background: status.surface }} className="rounded-xl border-0 px-3 py-2.5 text-xs font-bold">{scriptStatuses.map((value) => <option key={value} value={value}>{scriptStatusConfig[value].label}</option>)}</select>
          <button type="button" disabled={saving || !dirty || !draft.title.trim()} onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} <span className="hidden sm:inline">Lưu</span></button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-[#F1C9C2] bg-[#FFF0EC] p-3 text-sm text-[#9A4B42]">{error}</p>}
      {(notice || exportNotice) && <p role="status" className="rounded-xl border border-[#CFE2C7] bg-[#EFF8EB] p-3 text-sm text-[#417447]">{exportNotice || notice}</p>}
      {assisting ? <AiProgressStatus label={`Emsen đang hoàn thiện ${assisting === "body" ? "Nội dung" : assisting === "storyboard" ? "Storyboard" : assisting.toUpperCase()}`} /> : null}
      {draft.planReference && planSync && planSync.state !== "current" && (
        <section className={`rounded-[18px] border p-4 text-sm ${planSync.state === "source-removed" ? "border-[#F0D6A8] bg-[#FFF7E8] text-[#7C6238]" : "border-[#CFE2C7] bg-[#F4FAF0] text-[#466D47]"}`}>
          <p className="flex items-center gap-2 font-bold"><Link2 size={16} /> {planSync.state === "source-removed" ? "Nội dung nguồn không còn trong lịch" : `Đã đồng bộ từ ${draft.planReference.planName}`}</p>
          {planSync.state === "source-removed" ? <p className="mt-1 text-xs leading-5">Kịch bản vẫn được giữ nguyên để bạn quyết định tiếp.</p> : <div className="mt-1 space-y-1 text-xs leading-5">{appliedSyncLabels.length > 0 && <p>Đã cập nhật: {appliedSyncLabels.join(", ")}.</p>}{preservedSyncLabels.length > 0 && <p>Đã giữ phần bạn tự sửa: {preservedSyncLabels.join(", ")}.</p>}{appliedSyncLabels.length === 0 && preservedSyncLabels.length === 0 && <p>Kế hoạch nguồn đã lên phiên bản {draft.planReference.contentPlanVersion}; kịch bản không cần đổi.</p>}</div>}
        </section>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-3">
          {draft.creativeStrategy.selectedConcept && <section className="rounded-[22px] border border-[#E3D6E1] bg-gradient-to-r from-[#FBF4FA] to-white p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-full bg-[#F0E2EE] px-2.5 py-1 text-[10px] font-bold text-[#825277]">Góc đã chọn · {draft.creativeStrategy.selectedConcept.label}</span>
              <p className="min-w-0 flex-1 text-sm font-bold leading-6 text-[#3C4F3E]">“{draft.creativeStrategy.selectedConcept.hook}”</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#748A74]"><strong className="text-[#5D6F5D]">Điểm căng:</strong> {draft.creativeStrategy.selectedConcept.tension}</p>
            <details className="mt-3 rounded-xl border border-[#E9E0E7] bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[11px] font-bold text-[#72506B]">Chất liệu và hướng phát triển <ChevronDown size={14} /></summary>
              <div className="space-y-3 border-t border-[#EFE8ED] p-3 text-xs leading-5 text-[#748A74]">
                <p>{draft.creativeStrategy.selectedConcept.development}</p>
                <p><strong className="text-[#557058]">Câu hỏi gợi mở:</strong> {draft.creativeStrategy.selectedConcept.creatorPrompt}</p>
                <label className="block font-bold text-[#557058]">Trải nghiệm thật của bạn<textarea className={inputClass} rows={3} maxLength={4000} value={draft.creativeStrategy.creatorExperience} onChange={(event) => changeStrategy({ creatorExperience: event.target.value })} placeholder="Thêm chi tiết để Emsen chỉnh sát với bạn hơn…" /></label>
              </div>
            </details>
          </section>}

          <section className="flex items-center gap-4 rounded-[22px] border border-[#D8E9D2] bg-[#F4FAF0] px-4 py-3">
            <EmsenAvatar activity={completedSections === 3 ? "checklist" : "writing"} className="h-14 w-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-[#31583A]">{completedSections === 3 ? "Ba phần chính đã sẵn sàng" : `Hoàn thiện ${3 - completedSections} phần chính`}</p>
                <span className="shrink-0 text-xs font-bold text-[#3F8240]">{completedSections}/3</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DCEAD6]"><span className="block h-full rounded-full bg-[#72B65D] transition-all" style={{ width: `${(completedSections / 3) * 100}%` }} /></div>
              <p className={`mt-1.5 text-[10px] ${wordCountState === "balanced" ? "text-[#3F8240]" : "text-[#879487]"}`}>{wordCountState === "balanced" ? "Độ dài đang phù hợp với thời lượng." : wordCountState === "short" ? `Có thể phát triển thêm để đạt khoảng ${wordRange.min}–${wordRange.max} từ.` : `Có thể rút gọn để gần khoảng ${wordRange.min}–${wordRange.max} từ.`}</p>
              {timelineNeedsUpdate ? <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-[#A06F3F]"><Clock3 size={11} /> Timeline đang kết thúc ở {timelineEndSeconds}s, khác mục tiêu {draft.settings.targetDurationSeconds}s. Hãy nhờ Emsen chia lại mốc thời gian.</p> : null}
            </div>
          </section>

          <TextSection number={1} title="Hook" value={draft.content.hook} rows={3} placeholder="Câu mở đầu khiến người xem dừng lại…" section="hook" busy={assisting === "hook"} aiConfigured={aiConfigured} onChange={(hook) => changeContent({ hook })} onAssist={onAssist} onSettings={onSettings} />
          <TextSection number={2} title="Nội dung" value={draft.content.body} rows={8} placeholder="Nói điều chính như đang trò chuyện với người xem…" section="body" busy={assisting === "body"} aiConfigured={aiConfigured} onChange={(body) => changeContent({ body })} onAssist={onAssist} onSettings={onSettings} />
          <TextSection number={3} title="CTA" value={draft.content.cta} rows={3} placeholder="Bạn muốn người xem làm gì tiếp theo?" section="cta" busy={assisting === "cta"} aiConfigured={aiConfigured} onChange={(cta) => changeContent({ cta })} onAssist={onAssist} onSettings={onSettings} />

          {completedSections === 3 && !storyboardRequested && !draft.content.storyboard.length ? (
            <section className="rounded-[22px] border border-[#D9D4E5] bg-gradient-to-br from-[#FBF6FC] to-white p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F3EAF1] text-[#8B557D]"><Film size={20} /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-[#284D31]">Kịch bản đã ổn rồi!</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#748A74]">Bạn có muốn mình giúp chuyển nó thành Storyboard để dễ hình dung và bắt tay vào quay hơn không?</p>
                  <button type="button" onClick={requestStoryboard} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#72506B] px-4 py-2.5 text-xs font-bold text-white"><Sparkles size={14} /> Chuyển thành Storyboard</button>
                </div>
              </div>
            </section>
          ) : null}

          {storyboardExplainerOpen ? (
            <section className="rounded-[22px] border border-[#D9D4E5] bg-[#FBF6FC] p-5">
              <div className="flex items-start gap-3">
                <EmsenAvatar activity="idea" className="h-14 w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8B557D]">Storyboard là gì?</p>
                  <p className="mt-2 text-sm leading-6 text-[#5F6F60]">Storyboard giúp biến kịch bản thành từng cảnh quay cụ thể, để bạn biết mỗi đoạn nên quay gì, thể hiện như thế nào, dùng thoại trực tiếp hay voice-over, góc quay ra sao và cần hiển thị nội dung gì trên màn hình. Nhờ đó, bạn có thể hình dung video rõ hơn trước khi quay và hạn chế việc vừa quay vừa phải nghĩ tiếp.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void startStoryboard(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#72506B] px-4 py-2.5 text-xs font-bold text-white"><Sparkles size={14} /> {aiConfigured ? "Tạo cùng Emsen" : "Mở và kết nối AI"}</button>
                    <button type="button" onClick={() => void startStoryboard(false)} className="rounded-xl border border-[#D7CCDA] bg-white px-4 py-2.5 text-xs font-bold text-[#72506B]">Tự chia cảnh</button>
                    <button type="button" onClick={() => setStoryboardExplainerOpen(false)} className="px-3 py-2.5 text-xs font-bold text-[#879487]">Để sau</button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {storyboardRequested || draft.content.storyboard.length ? (
          <details className="group rounded-[22px] border border-[#DDEBD6] bg-white">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F3EAF1] text-[#8B557D]"><Film size={18} /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[#284D31]">Storyboard</h3>
                <p className="text-[11px] text-[#879487]">{draft.content.storyboard.length} cảnh · {storyboardDuration} giây</p>
              </div>
              <span className="hidden text-xs font-bold text-[#748A74] sm:inline">Chỉnh cảnh quay</span>
              <ChevronDown size={17} className="text-[#748A74] transition group-open:rotate-180" />
            </summary>

            <div className="border-t border-[#E8EEE5] p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={addFrame} disabled={draft.content.storyboard.length >= 16} className="inline-flex items-center gap-2 rounded-xl border border-[#C8DBC1] px-3 py-2 text-xs font-bold disabled:opacity-40"><Plus size={14} /> Thêm cảnh</button>
                <button type="button" aria-expanded={storyboardAssistantOpen} onClick={() => setStoryboardAssistantOpen((value) => !value)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${storyboardAssistantOpen ? "bg-[#EAF6E4] text-[#31583A]" : "border border-[#D7E5D1] text-[#3F8240]"}`}><Sparkles size={14} /> Nhờ Emsen chia cảnh</button>
              </div>
              {storyboardAssistantOpen && <AiPrompt section="storyboard" busy={assisting === "storyboard"} enabled={aiConfigured} onAsk={(prompt, referenceAssets) => onAssist("storyboard", prompt, referenceAssets)} onClose={() => setStoryboardAssistantOpen(false)} onSettings={onSettings} />}

              <div className="mt-4 space-y-2">
                {draft.content.storyboard.map((frame, index) => (
                  <details key={frame.id} className="rounded-2xl border border-[#E8DED8] bg-[#FFFCF8]">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 sm:px-4">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#EAF6E4] text-xs font-black text-[#3F8240]">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#31583A]">{frame.title || `Cảnh ${index + 1}`}</span>
                      <span className="text-[11px] text-[#879487]">{frame.durationSeconds}s</span>
                      <ChevronDown size={15} className="text-[#879487]" />
                    </summary>
                    <div className="border-t border-[#EFE8E2] p-3 sm:p-4">
                      <div className="flex items-end gap-2">
                        <label className="min-w-0 flex-1 text-[11px] font-bold">Tên cảnh<input className={inputClass} maxLength={120} value={frame.title} onChange={(event) => updateFrame(frame.id, { title: event.target.value })} /></label>
                        <button type="button" onClick={() => moveFrame(index, -1)} disabled={index === 0} className="mb-0.5 rounded-lg p-2 disabled:opacity-20" aria-label="Đưa cảnh lên"><ChevronUp size={16} /></button>
                        <button type="button" onClick={() => moveFrame(index, 1)} disabled={index === draft.content.storyboard.length - 1} className="mb-0.5 rounded-lg p-2 disabled:opacity-20" aria-label="Đưa cảnh xuống"><ChevronDown size={16} /></button>
                        <button type="button" onClick={() => changeContent({ storyboard: draft.content.storyboard.filter((item) => item.id !== frame.id) })} className="mb-0.5 rounded-lg p-2 text-[#A15B55]" aria-label="Xóa cảnh"><Trash2 size={16} /></button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-[11px] font-bold">Hình ảnh / hành động<textarea className={inputClass} rows={3} value={frame.visual} onChange={(event) => updateFrame(frame.id, { visual: event.target.value })} /></label>
                        <label className="text-[11px] font-bold">Lời thoại<textarea className={inputClass} rows={3} value={frame.dialogue} onChange={(event) => updateFrame(frame.id, { dialogue: event.target.value })} /></label>
                        <label className="text-[11px] font-bold">Mục đích của cảnh<textarea className={inputClass} rows={2} value={frame.visualPurpose} onChange={(event) => updateFrame(frame.id, { visualPurpose: event.target.value })} placeholder="Cảnh này giúp người xem hiểu hoặc cảm thấy gì?" /></label>
                        <label className="text-[11px] font-bold">Cảnh phụ / B-roll<textarea className={inputClass} rows={2} value={frame.broll} onChange={(event) => updateFrame(frame.id, { broll: event.target.value })} placeholder="Chi tiết tay, đồ vật, màn hình…" /></label>
                        <label className="text-[11px] font-bold">Nhịp cảm xúc<input className={inputClass} value={frame.emotionalBeat} onChange={(event) => updateFrame(frame.id, { emotionalBeat: event.target.value })} placeholder="Tò mò, đồng cảm, bất ngờ…" /></label>
                        <label className="text-[11px] font-bold">Chuyển cảnh<input className={inputClass} value={frame.transition} onChange={(event) => updateFrame(frame.id, { transition: event.target.value })} placeholder="Cắt thẳng, đổi góc, nối bằng hành động…" /></label>
                        <label className="text-[11px] font-bold sm:col-span-2">Vai trò giữ chân<input className={inputClass} value={frame.retentionRole} onChange={(event) => updateFrame(frame.id, { retentionRole: event.target.value })} placeholder="Mở câu hỏi, đổi nhịp, hé lộ kết quả…" /></label>
                        <label className="text-[11px] font-bold">Chỉ dẫn quay<textarea className={inputClass} rows={2} value={frame.direction} onChange={(event) => updateFrame(frame.id, { direction: event.target.value })} /></label>
                        <label className="text-[11px] font-bold">Thời lượng (giây)<input type="number" min={0} max={600} className={inputClass} value={frame.durationSeconds} onChange={(event) => updateFrame(frame.id, { durationSeconds: Math.max(0, Number(event.target.value)) })} /></label>
                      </div>
                    </div>
                  </details>
                ))}
                {!draft.content.storyboard.length && <p className="rounded-xl border border-dashed border-[#D8E1D3] p-5 text-center text-xs text-[#879487]">Chưa có cảnh. Thêm thủ công hoặc nhờ Emsen.</p>}
              </div>
            </div>
          </details>
          ) : null}
        </div>

        <aside className="space-y-3 xl:sticky xl:top-24">
          {draft.planReference && <section className="rounded-[20px] border border-[#D8E9D2] bg-[#F4FAF0] p-4"><p className="flex items-center gap-2 text-xs font-bold text-[#3F8240]"><FolderKanban size={15} /> {draft.planReference.planName}</p><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#748A74]">Nội dung nguồn: {draft.planReference.planTitle}</p></section>}
          <details className="group rounded-[22px] border border-[#DDEBD6] bg-white">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF6E4] text-[#3F8240]"><Settings2 size={17} /></span>
              <div className="min-w-0 flex-1"><h3 className="text-sm font-bold">Thông tin quay</h3><p className="truncate text-[11px] text-[#879487]">{draft.settings.platform || "Chưa chọn"} · {formatScriptDate(draft.settings.scheduledFor)}</p></div>
              <ChevronDown size={16} className="transition group-open:rotate-180" />
            </summary>
            <div className="space-y-4 border-t border-[#E8EEE5] p-4">
              <label className="block text-xs font-bold">Nền tảng<input className={inputClass} maxLength={80} value={draft.settings.platform} onChange={(event) => changeSettings({ platform: event.target.value })} /></label>
              <label className="block text-xs font-bold">Định dạng<input className={inputClass} maxLength={120} value={draft.settings.format} onChange={(event) => changeSettings({ format: event.target.value })} /></label>
              <label className="block text-xs font-bold">Ngày quay<input type="date" className={inputClass} value={draft.settings.scheduledFor ?? ""} onChange={(event) => changeSettings({ scheduledFor: event.target.value || null })} /></label>
              <div>
                <p className="text-xs font-bold">Thời lượng mục tiêu</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{scriptDurationPresets.map((seconds) => <button key={seconds} type="button" onClick={() => changeSettings({ targetDurationSeconds: seconds })} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${draft.settings.targetDurationSeconds === seconds ? "border-[#72B65D] bg-[#EAF6E4] text-[#31583A]" : "border-[#E5DED8] text-[#748A74]"}`}>{seconds}s</button>)}</div>
                <label className="mt-2 flex items-center gap-2 text-[11px] text-[#748A74]"><input aria-label="Thời lượng mục tiêu tùy chỉnh" type="number" min={5} max={3600} className="w-24 rounded-xl border border-[#E6D4CE] bg-[#FFFDF8] px-3 py-2 text-sm text-[#31583A]" value={draft.settings.targetDurationSeconds} onChange={(event) => changeSettings({ targetDurationSeconds: Number(event.target.value) })} /> giây · {wordRange.min}–{wordRange.max} từ</label>
              </div>
              <label className="block text-xs font-bold">Tỷ lệ khung hình<select className={inputClass} value={draft.settings.aspectRatio} onChange={(event) => changeSettings({ aspectRatio: event.target.value as ScriptDocumentDto["settings"]["aspectRatio"] })}>{["9:16", "4:5", "1:1", "16:9"].map((ratio) => <option key={ratio}>{ratio}</option>)}</select></label>
              <label className="block text-xs font-bold">Mục tiêu<textarea className={inputClass} rows={2} value={draft.settings.objective} onChange={(event) => changeSettings({ objective: event.target.value })} /></label>
            </div>
          </details>

          <details className="group rounded-[22px] border border-[#E6DCD5] bg-[#FFFCF8]">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-bold"><span className="flex items-center gap-2"><Settings2 size={16} /> Chỉnh nâng cao</span><ChevronDown size={16} className="transition group-open:rotate-180" /></summary>
            <div className="space-y-4 border-t border-[#EFE8E2] p-4">
              <label className="block text-xs font-bold">Khán giả<textarea className={inputClass} rows={2} value={draft.settings.audience} onChange={(event) => changeSettings({ audience: event.target.value })} /></label>
              <label className="block text-xs font-bold">Giọng điệu<textarea className={inputClass} rows={2} value={draft.settings.tone} onChange={(event) => changeSettings({ tone: event.target.value })} /></label>
              <label className="block text-xs font-bold">Kiểu hook<input className={inputClass} value={draft.advancedSettings.hookStyle} onChange={(event) => changeAdvanced({ hookStyle: event.target.value })} /></label>
              <label className="block text-xs font-bold">Nhịp độ<select className={inputClass} value={draft.advancedSettings.pacing} onChange={(event) => changeAdvanced({ pacing: event.target.value as ScriptDocumentDto["advancedSettings"]["pacing"] })}><option value="slow">Chậm</option><option value="balanced">Cân bằng</option><option value="fast">Nhanh</option></select></label>
              <label className="block text-xs font-bold">Kiểu CTA<input className={inputClass} value={draft.advancedSettings.ctaStyle} onChange={(event) => changeAdvanced({ ctaStyle: event.target.value })} /></label>
              <label className="block text-xs font-bold">Ngôn ngữ<input className={inputClass} value={draft.advancedSettings.language} onChange={(event) => changeAdvanced({ language: event.target.value })} /></label>
              <label className="block text-xs font-bold">Ghi chú sản xuất<textarea className={inputClass} rows={4} value={draft.advancedSettings.productionNotes} onChange={(event) => changeAdvanced({ productionNotes: event.target.value })} /></label>
            </div>
          </details>

          <section className="flex items-center gap-3 rounded-[20px] border border-[#D8E9D2] bg-[#F4FAF0] p-3">
            <EmsenAvatar emotion="content" className="h-12 w-12 shrink-0" />
            <div className="min-w-0 text-xs text-[#627862]"><p className="font-bold text-[#3F8240]">Cần chỉnh câu nào?</p><p className="mt-0.5">Bấm “Nhờ Emsen” ngay tại phần đó.</p></div>
          </section>
          <p className="flex items-center justify-center gap-2 text-[11px] text-[#879487]"><Clock3 size={13} /> Cập nhật {new Date(draft.updatedAt).toLocaleString("vi-VN")}</p>
        </aside>
      </div>
    </section>
  );
}
