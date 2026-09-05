import {
  ArrowRight,
  Clock3,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { EmsenAvatar } from "../../../components/branding/EmsenAvatar";
import type { CreatorDnaInsight } from "../creatorDnaTypes";

type CreatorDnaIntroProps = {
  deferred?: boolean;
  insight?: CreatorDnaInsight | null;
  onContinue?: () => void;
  onSkip: () => void;
  onStart: () => void;
};

const onboardingPhases = [
  { label: "Danh tính", description: "Tên và cách xưng hô" },
  { label: "Nội dung", description: "Lĩnh vực và nền tảng" },
  { label: "Chất giọng", description: "Phong cách và khán giả" },
  { label: "Ranh giới", description: "Những điều cần tránh" },
];

export function CreatorDnaIntro({
  deferred = false,
  insight,
  onContinue,
  onSkip,
  onStart,
}: CreatorDnaIntroProps) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[#284D31] px-6 py-8 text-white shadow-[0_24px_60px_rgba(40,77,49,0.16)] sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        <div className="hero-current hero-current-one" />
        <span className="petal petal-one" />
        <span className="petal petal-two" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-[#DDF3D3]">
            <Sparkles size={14} />
            CREATOR DNA · KHỞI ĐẦU NHẸ NHÀNG
          </div>
          <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-[26px] bg-white/90 shadow-[0_14px_32px_rgba(70,168,45,0.22)]">
              <EmsenAvatar
                activity="writing"
                alt="Emsen đang ghi lại chất riêng của bạn"
                className="h-28 w-28"
              />
            </div>
            <div>
              <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">
                {deferred
                  ? "Khi nào sẵn sàng, mình bắt đầu nhé."
                  : "Cho mình biết một chút về bạn nhé."}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#DCEED9] sm:text-base sm:leading-7">
                {deferred
                  ? "Bạn đã chọn để bước này lại sau. emsen vẫn hoạt động bình thường và bạn có thể quay lại xây Creator DNA bất cứ lúc nào."
                  : "Chỉ khoảng 3 phút để emsen có đủ điểm xuất phát, từ đó viết nội dung đúng phong cách và cá tính riêng của bạn hơn — thay vì một kịch bản AI chung chung."}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  className="group inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#46A82D] shadow-lg transition hover:-translate-y-0.5"
                  onClick={onStart}
                  type="button"
                >
                  {deferred ? "Bắt đầu khi đã sẵn sàng" : "Bắt đầu · khoảng 3 phút"}
                  <ArrowRight
                    className="transition-transform group-hover:translate-x-0.5"
                    size={17}
                  />
                </button>
                <button
                  className="inline-flex h-12 items-center rounded-2xl border border-white/20 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10"
                  onClick={deferred ? onContinue : onSkip}
                  type="button"
                >
                  {deferred ? "Tiếp tục sử dụng emsen" : "Để mình làm sau"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {insight?.stage === "signup" ? (
        <section className="grid gap-5 rounded-[24px] border border-[#E2EDD9] bg-[#F5FAF3] p-5 shadow-[0_14px_40px_rgba(40,77,49,0.04)] sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4C9355]">
                Đánh giá khi tạo tài khoản
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#71816E]">
                {insight.provider === "google-gemini" ? "Google Gemini" : "Fallback an toàn"}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-[#284D31]">{insight.headline}</h3>
            <p className="mt-2 text-sm leading-6 text-[#71816E]">{insight.note}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {insight.signals.map((signal) => (
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#5D715A]" key={signal}>
                  {signal}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#DCE9D7] bg-white/70 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#82927F]">
              Mức sẵn sàng
            </p>
            <p className="mt-1 text-3xl font-bold text-[#4C9355]">{insight.readiness}%</p>
            <p className="mt-1 text-[10px] text-[#82927F]">Sẽ tăng sau 6 câu hỏi</p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 shadow-[0_14px_40px_rgba(40,77,49,0.05)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#46A82D]">
                HỎI ÍT, NHƯNG HỎI ĐÚNG
              </p>
              <h3 className="mt-1 text-xl font-bold text-[#284D31]">6 câu hỏi nhỏ, 4 tín hiệu lớn</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF6E4] px-3 py-1.5 text-xs font-bold text-[#46A82D]">
              <Clock3 size={14} />
              Khoảng 3 phút
            </span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {onboardingPhases.map((phase, index) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-[#DDEBD6] bg-[#FFFDF8] p-4"
                key={phase.label}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E3F2DB] text-xs font-bold text-[#46A82D]">
                  0{index + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#31583A]">{phase.label}</p>
                  <p className="mt-0.5 text-xs text-[#829782]">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[24px] border border-[#E2EDD9] bg-[#F5FAF3] p-5 sm:p-6">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E5F5E4] text-[#3F7E49]">
            <HeartHandshake size={21} />
          </div>
          <h3 className="mt-5 text-lg font-bold text-[#284D31]">Không bắt buộc, không bị chặn</h3>
          <p className="mt-2 text-sm leading-6 text-[#71816E]">
            Bạn có thể bỏ qua toàn bộ hoặc từng câu khuyến nghị. emsen sẽ tiếp tục tìm hiểu
            bạn một cách tự nhiên trong quá trình cùng làm nội dung.
          </p>
          <div className="mt-5 flex items-start gap-2.5 border-t border-[#DDEBD8] pt-4 text-xs leading-5 text-[#71816E]">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#67B86F]" size={16} />
            Câu trả lời được lưu cho tài khoản của bạn. Chỉ backend mới gọi bộ đánh giá AI.
          </div>
        </aside>
      </section>
    </div>
  );
}
