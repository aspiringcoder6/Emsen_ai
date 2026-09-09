import type {
  AiPreferencesDto,
  AiProactiveFrequency,
} from "@creator-flow/contracts";
import {
  BellOff,
  BrainCircuit,
  Check,
  Clock3,
  Leaf,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { GoogleAiKeySettings } from "../features/settings/GoogleAiKeySettings";
import {
  getAiPreferences,
  updateAiPreferences,
} from "../features/chat/chatApi";

type SettingsPageProps = {
  onPreferencesChanged: () => void;
};

const frequencyOptions: Array<{
  description: string;
  icon: typeof BellOff;
  id: AiProactiveFrequency;
  label: string;
  timing: string;
}> = [
  {
    description: "AI chỉ phản hồi khi bạn chủ động mở chat và nhắn trước.",
    icon: BellOff,
    id: "off",
    label: "Tắt hỏi thăm",
    timing: "Không tự hỏi",
  },
  {
    description: "Một lời gợi mở nhẹ, phù hợp khi bạn không muốn bị gián đoạn.",
    icon: Leaf,
    id: "gentle",
    label: "Nhẹ nhàng",
    timing: "Khoảng 1 lần / tuần",
  },
  {
    description: "Giữ nhịp sáng tạo đều mà không tạo cảm giác bị thúc ép.",
    icon: Sparkles,
    id: "balanced",
    label: "Cân bằng",
    timing: "Khoảng 2–3 lần / tuần",
  },
  {
    description: "Dành cho giai đoạn cần brainstorm và sản xuất nội dung liên tục.",
    icon: Zap,
    id: "frequent",
    label: "Thường xuyên",
    timing: "Tối đa 1 lần / ngày",
  },
];

function formatNextQuestion(value: string | null) {
  if (!value) {
    return "Đang tắt";
  }
  const date = new Date(value);
  if (date.getTime() <= Date.now() + 60_000) {
    return "Khi bạn mở chat lần tới";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SettingsPage({ onPreferencesChanged }: SettingsPageProps) {
  const [preferences, setPreferences] = useState<AiPreferencesDto | null>(null);
  const [selected, setSelected] = useState<AiProactiveFrequency>("balanced");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getAiPreferences()
      .then((result) => {
        if (active) {
          setPreferences(result);
          setSelected(result.proactiveFrequency);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Chưa thể tải cài đặt AI.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const savePreferences = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const result = await updateAiPreferences(selected);
      setPreferences(result);
      setSaved(true);
      onPreferencesChanged();
      window.setTimeout(() => setSaved(false), 2_400);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Chưa thể lưu cài đặt AI.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <GoogleAiKeySettings onChanged={onPreferencesChanged} />
      <div className="overflow-hidden rounded-[30px] border border-[#DDEBD6] bg-white shadow-[0_18px_52px_rgba(40,77,49,0.07)]">
        <div className="border-b border-[#E4EFE0] bg-gradient-to-r from-[#F8FCF5] via-white to-[#F6FAF3] px-5 py-7 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="grid h-13 w-13 shrink-0 place-items-center rounded-[19px] bg-gradient-to-br from-[#46A82D] to-[#82C95B] text-white shadow-[0_12px_26px_rgba(70,168,45,0.22)]">
              <BrainCircuit size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#46A82D]">
                Emsen buddy
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#284D31] sm:text-3xl">
                AI nên chủ động với bạn đến mức nào?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#748A74]">
                emsen dùng những câu hỏi ngắn để bắt nhịp công việc và làm Creator DNA
                phong phú dần. Bạn luôn có thể đổi tần suất hoặc tắt hoàn toàn.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          {loading ? (
            <div className="grid min-h-52 place-items-center text-center">
              <div>
                <LoaderCircle className="mx-auto animate-spin text-[#46A82D]" size={28} />
                <p className="mt-3 text-sm font-semibold text-[#748A74]">Đang tải cài đặt…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {frequencyOptions.map((option) => {
                  const Icon = option.icon;
                  const active = selected === option.id;
                  return (
                    <button
                      aria-pressed={active}
                      className={`relative rounded-[22px] border p-5 text-left transition ${
                        active
                          ? "border-[#46A82D] bg-[#F1F8EC] shadow-[0_10px_28px_rgba(70,168,45,0.12)]"
                          : "border-[#DCE9D7] bg-[#FFFDF8] hover:border-[#82C95B] hover:bg-[#F8FCF5]"
                      }`}
                      key={option.id}
                      onClick={() => {
                        setSelected(option.id);
                        setSaved(false);
                      }}
                      type="button"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                            active
                              ? "bg-[#46A82D] text-white"
                              : "bg-[#EAF3E6] text-[#607760]"
                          }`}
                        >
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#284D31]">{option.label}</h3>
                            {active ? (
                              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#4C9355] text-white">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[11px] font-bold text-[#46A82D]">
                            {option.timing}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-[#748A74]">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E4EFE0] pt-6">
                <div className="flex items-center gap-2.5 text-xs text-[#748A74]">
                  <Clock3 size={16} />
                  Lần hỏi tiếp theo: {formatNextQuestion(preferences?.nextProactiveAt ?? null)}
                </div>
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#46A82D] to-[#82C95B] px-5 text-sm font-bold text-white shadow-[0_9px_22px_rgba(70,168,45,0.2)] transition disabled:cursor-wait disabled:opacity-60 enabled:hover:-translate-y-0.5"
                  disabled={saving || preferences?.proactiveFrequency === selected}
                  onClick={() => void savePreferences()}
                  type="button"
                >
                  {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
                  {saved ? "Đã lưu" : saving ? "Đang lưu…" : "Lưu cài đặt"}
                </button>
              </div>
              {error ? (
                <p className="mt-4 rounded-xl border border-[#FFD2D2] bg-[#FFF4F4] px-4 py-3 text-xs font-semibold text-[#B83F3F]">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-[#E1EDD9] bg-[#F7FBF5] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#4C9355]" size={21} />
            <h3 className="text-sm font-bold text-[#284D31]">Bạn luôn kiểm soát dữ liệu</h3>
          </div>
          <p className="mt-3 text-xs leading-6 text-[#748171]">
            Câu hỏi thu thập thông tin luôn được gắn nhãn trong chat. Tín hiệu đã ghi
            nhớ xuất hiện trong Creator DNA và có thể được gỡ bất cứ lúc nào.
          </p>
        </div>
        <div className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#46A82D]" size={21} />
            <h3 className="text-sm font-bold text-[#284D31]">AI hiểu đúng ngữ cảnh</h3>
          </div>
          <p className="mt-3 text-xs leading-6 text-[#748A74]">
            Khi trả lời, Gemini nhận Creator DNA và các tín hiệu đã xác nhận gần đây.
            Số điện thoại và mật khẩu không bao giờ được đưa vào prompt.
          </p>
        </div>
      </div>
    </section>
  );
}
