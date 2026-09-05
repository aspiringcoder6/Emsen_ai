import {
  ChevronRight,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { EmsenAvatar } from "../../../components/branding/EmsenAvatar";

export function FlowHero({ compact }: { compact: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#285B35] via-[#35743D] to-[#4B8D46] px-6 py-8 text-white shadow-[0_24px_60px_rgba(47,104,55,0.2)] sm:px-9 sm:py-10 xl:min-h-[310px]">
      <div className="hero-current hero-current-one" />
      <div className="hero-current hero-current-two" />
      <span className="petal petal-one" />
      <span className="petal petal-two" />
      <span className="petal petal-three" />
      <div className="relative z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-[#DDF5D2] backdrop-blur">
          <Sparkles size={14} />
          GÓC SÁNG TẠO CỦA BẠN
        </div>
        <h2
          className={`mt-5 font-bold leading-tight tracking-[-0.04em] ${
            compact ? "text-3xl sm:text-4xl" : "text-3xl sm:text-4xl xl:text-[44px]"
          }`}
        >
          Từ chất riêng của bạn
          <br />
          đến nội dung <span className="text-[#FFA8BA]">nở hoa.</span>
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-6 text-[#DCEED9] sm:text-base">
          Emsen kết nối từng ý tưởng thành một hành trình liền mạch — từ chất riêng của bạn đến
          video hoàn chỉnh.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#3D9531] shadow-lg transition hover:-translate-y-0.5"
            type="button"
          >
            <WandSparkles size={18} />
            Gieo ý tưởng mới
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10"
            type="button"
          >
            Xem hành trình
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute bottom-0 right-0 top-0 w-[42%] ${
          compact ? "hidden" : "hidden lg:block"
        }`}
      >
        <div className="absolute bottom-[-6.5rem] right-[-4rem] h-[360px] w-[360px] rounded-full bg-[#DFF4C9]/12 blur-sm" />
        <div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-white/10" />
        <EmsenAvatar
          activity="working"
          alt="Emsen đang cùng bạn phát triển ý tưởng"
          className="absolute -bottom-9 right-1 w-[330px] drop-shadow-[0_22px_28px_rgba(20,60,29,0.28)] xl:right-5 xl:w-[360px]"
          eager
        />
      </div>
    </section>
  );
}
