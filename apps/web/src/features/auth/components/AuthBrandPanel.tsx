import { Check, Sparkles } from "lucide-react";
import { EmsenAvatar } from "../../../components/branding/EmsenAvatar";
import { EmsenMark } from "../../../components/branding/EmsenMark";

const benefits = [
  "Một không gian làm việc thống nhất từ ý tưởng đến video",
  "Để chất riêng của bạn được áp dụng xuyên suốt nội dung",
  "Theo dõi tiến độ và lịch đăng trong cùng một không gian",
];

export function AuthBrandPanel() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#F4FBEF] via-[#EAF7DF] to-[#DCEFD2] px-12 py-10 text-[#284D31] lg:flex lg:flex-col xl:px-16 xl:py-12">
      <div className="auth-current auth-current-one" />
      <div className="auth-current auth-current-two" />
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-[14%] h-[280px] w-full opacity-80"
        fill="none"
        viewBox="0 0 700 280"
      >
        <defs>
          <linearGradient id="auth-flow-line" x1="40" x2="650" y1="210" y2="75">
            <stop stopColor="#46A82D" />
            <stop offset="0.52" stopColor="#F58FA5" />
            <stop offset="1" stopColor="#92CF69" />
          </linearGradient>
        </defs>
        <path
          className="flow-path"
          d="M-20 236C91 173 148 252 239 186C330 120 385 187 465 120C526 69 582 91 727 30"
          stroke="url(#auth-flow-line)"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M-45 269C84 210 158 294 257 221C354 150 432 219 518 147C578 97 636 108 745 63"
          opacity="0.1"
          stroke="#2F7D35"
          strokeLinecap="round"
          strokeWidth="54"
        />
      </svg>

      <div className="relative z-10 w-fit">
        <EmsenMark full size={86} />
      </div>

      <div className="relative z-10 my-auto max-w-xl pb-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#8FCB78]/40 bg-white/65 px-3 py-1.5 text-xs font-bold text-[#3D873A] shadow-sm backdrop-blur">
          <Sparkles size={14} />
          KHU VƯỜN SÁNG TẠO EMSEN
        </div>
        <h1 className="mt-6 text-4xl font-bold leading-[1.12] tracking-[-0.045em] xl:text-[52px]">
          Nuôi chất riêng.
          <br />
          Để nội dung <span className="text-[#E9698A]">nở hoa.</span>
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-[#58725A]">
          Đăng nhập để tiếp tục biến chất riêng của bạn thành kế hoạch, kịch bản và
          video có sức lan tỏa.
        </p>

        <div className="mt-9 max-w-[330px] space-y-3.5 xl:max-w-[360px]">
          {benefits.map((benefit) => (
            <div className="flex items-center gap-3 text-sm text-[#3F6045]" key={benefit}>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/80 text-[#46A82D] shadow-sm">
                <Check size={14} strokeWidth={2.5} />
              </span>
              {benefit}
            </div>
          ))}
        </div>
      </div>

      <EmsenAvatar
        activity="waving"
        alt="Emsen chào bạn"
        className="pointer-events-none absolute -bottom-12 right-[-4.5rem] z-[5] w-[270px] drop-shadow-[0_20px_35px_rgba(52,104,48,0.16)] xl:right-[-3.5rem] xl:w-[310px]"
        eager
      />

      <p className="relative z-10 text-xs text-[#688069]">
        © 2026 emsen · Internal MVP
      </p>
    </section>
  );
}
