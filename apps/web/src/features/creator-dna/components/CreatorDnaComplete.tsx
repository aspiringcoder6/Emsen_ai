import {
  ArrowRight,
  Bot,
  Check,
  Dna,
  PencilLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  CreatorDnaInsight,
  CreatorDnaProfile,
} from "../creatorDnaTypes";

type CreatorDnaCompleteProps = {
  analyzing: boolean;
  insight: CreatorDnaInsight | null;
  onEdit: () => void;
  onStartCreating: () => void;
  profile: CreatorDnaProfile;
};

function getProfileSummary(profile: CreatorDnaProfile) {
  return [
    profile.displayName,
    profile.niche,
    ...profile.platforms,
    ...profile.toneTraits,
  ].filter(Boolean);
}

export function CreatorDnaComplete({
  analyzing,
  insight,
  onEdit,
  onStartCreating,
  profile,
}: CreatorDnaCompleteProps) {
  if (analyzing || !insight) {
    return (
      <section className="grid min-h-[560px] place-items-center overflow-hidden rounded-[30px] border border-[#DDEBD6] bg-white px-6 py-12 text-center shadow-[0_22px_60px_rgba(40,77,49,0.08)]">
        <div className="max-w-lg">
          <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-[30px] bg-[#EAF6E4] text-[#46A82D]">
            <span className="absolute inset-0 animate-ping rounded-[30px] bg-[#82C95B]/15" />
            <Dna className="relative animate-pulse" size={42} />
          </div>
          <span className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#EAF6E4] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#46A82D]">
            <Bot size={13} />
            Phân tích demo
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-[-0.035em] text-[#284D31] sm:text-3xl">
            emsen đang ghép những tín hiệu đầu tiên…
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#748A74]">
            Mình đang gửi 6 câu trả lời tới bộ đánh giá trên backend. Nếu Gemini chưa được
            cấu hình hoặc tạm thời gián đoạn, emsen sẽ dùng đánh giá fallback an toàn.
          </p>
        </div>
      </section>
    );
  }

  const summary = getProfileSummary(profile);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[#284D31] px-6 py-9 text-white shadow-[0_24px_60px_rgba(40,77,49,0.16)] sm:px-9 lg:px-12 lg:py-11">
        <div className="hero-current hero-current-one" />
        <span className="petal petal-one" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-[#DDF3D3]">
              <Sparkles size={14} />
              CREATOR DNA ĐÃ KHỞI TẠO
            </div>
            <h2 className="mt-6 max-w-3xl text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">
              Xong rồi! Mình bắt đầu hiểu bạn hơn rồi.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#DCEED9] sm:text-base sm:leading-7">
              Bạn không cần khai báo mọi thứ ngay từ đầu. Emsen sẽ tiếp tục học cách bạn
              nghĩ, viết và phản hồi trong những lần ta cùng tạo nội dung tiếp theo.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                className="group inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#46A82D] shadow-lg transition hover:-translate-y-0.5"
                onClick={onStartCreating}
                type="button"
              >
                Xây dựng định hướng kênh
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={17} />
              </button>
              <button
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10"
                onClick={onEdit}
                type="button"
              >
                <PencilLine size={16} />
                Chỉnh sửa câu trả lời
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#DDF3D3]">
                  Điểm khởi đầu
                </p>
                <p className="mt-1 text-sm text-white/70">Sẽ đầy dần theo thời gian</p>
              </div>
              <span className="text-3xl font-bold">{insight.readiness}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#67B86F] to-[#82C95B]"
                style={{ width: `${insight.readiness}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 shadow-[0_14px_40px_rgba(40,77,49,0.05)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#284D31]">Chân dung khởi đầu</h3>
                <span className="rounded-full bg-[#EAF6E4] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#46A82D]">
                  {insight.provider === "google-gemini" ? "Google Gemini" : "Fallback"}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#748A74]">{insight.headline}</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E3F2DB] text-[#46A82D]">
              <Dna size={21} />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {insight.signals.map((signal) => (
              <div
                className="flex items-start gap-3 rounded-2xl border border-[#DDEBD6] bg-[#FFFDF8] p-4 text-sm leading-6 text-[#526952]"
                key={signal}
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#EAF6E8] text-[#4C9355]">
                  <Check size={14} strokeWidth={3} />
                </span>
                {signal}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#F2E4E0] pt-5">
            {summary.map((item) => (
              <span
                className="rounded-full bg-[#EFF8E9] px-3 py-1.5 text-xs font-bold text-[#806663]"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <aside className="rounded-[24px] border border-[#E2EDD9] bg-[#F5FAF3] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E5F5E4] text-[#3F7E49]">
              <ShieldCheck size={21} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#284D31]">Bạn luôn kiểm soát</h3>
              <p className="mt-0.5 text-xs text-[#71816E]">Minh bạch và có thể chỉnh sửa</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-[#71816E]">{insight.note}</p>
          <div className="mt-5 rounded-2xl border border-[#DDEBD8] bg-white/65 p-4 text-xs leading-5 text-[#71816E]">
            Câu trả lời và đánh giá được lưu trong PostgreSQL theo tài khoản. Google API key
            chỉ được sử dụng ở backend.
          </div>
        </aside>
      </section>
    </div>
  );
}
