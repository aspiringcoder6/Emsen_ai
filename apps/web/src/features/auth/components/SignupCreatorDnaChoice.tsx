import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { EmsenAvatar } from "../../../components/branding/EmsenAvatar";

type SignupCreatorDnaChoiceProps = {
  displayName: string;
  error: string;
  loading: boolean;
  onBack: () => void;
  onStart: () => void;
};

const benefits = [
  "Biến một ý tưởng nhỏ thành kịch bản TikTok có cấu trúc rõ ràng",
  "Ghi nhận lĩnh vực, khán giả và phong cách bạn muốn thể hiện",
  "Đồng hành tiếp đến storyboard, cách quay và hoàn thiện video",
];

export function SignupCreatorDnaChoice({
  displayName,
  error,
  loading,
  onBack,
  onStart,
}: SignupCreatorDnaChoiceProps) {
  return (
    <div className="auth-form-enter overflow-hidden rounded-[28px] border border-[#D8E8D2] bg-white/92 shadow-[0_28px_80px_rgba(40,77,49,0.1)] backdrop-blur-xl">
      <div className="bg-gradient-to-br from-[#284D31] to-[#604649] px-6 py-7 text-white sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-white/90 shadow-[0_12px_28px_rgba(70,168,45,0.18)]">
            <EmsenAvatar
              activity="checklist"
              alt="Emsen cùng bạn thiết lập Creator DNA"
              className="h-[92px] w-[92px]"
            />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#DDF3D3]">
            <Sparkles size={12} />
            Làm quen cùng Emsen
          </span>
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-[#DDF3D3]">
          Xin chào, mình là Emsen
        </p>
        <h2 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.04em]">
          {displayName}, mình cùng làm quen nhé?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#DCEED9]">
          Mình là một trợ lý sáng tạo nội dung siêu thân thiện và luôn sẵn sàng đồng hành
          cùng bạn. Chỉ với một ý tưởng nhỏ, mình có thể giúp bạn tìm hướng triển khai,
          phát triển thành kịch bản TikTok cuốn hút, rồi đi tiếp đến cách thể hiện, cách quay
          và hoàn thiện video sao cho dễ làm, đúng phong cách của bạn hơn.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold text-[#46A82D]">
          <Clock3 size={15} />
          Khoảng 3 phút · bước làm quen dành cho tài khoản mới
        </div>
        <div className="mt-5 space-y-3">
          {benefits.map((benefit) => (
            <div className="flex items-start gap-3 text-sm leading-6 text-[#526952]" key={benefit}>
              <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#EEF8EF] text-[#4C9355]">
                <MessageCircleHeart size={14} />
              </span>
              {benefit}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[#E2EDD9] bg-[#F5FAF3] p-4 text-xs leading-5 text-[#71816E]">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#67B86F]" size={16} />
            Các câu trả lời được lưu trong hồ sơ Creator DNA và bạn vẫn có thể chỉnh lại
            bất cứ lúc nào trong tài khoản.
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {error ? (
            <div
              className="rounded-xl border border-[#FFD2D2] bg-[#FFF4F4] px-3.5 py-3 text-xs font-semibold text-[#B83F3F]"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <button
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#46A82D] to-[#82C95B] text-sm font-bold text-white shadow-[0_12px_28px_rgba(70,168,45,0.24)] transition disabled:cursor-wait disabled:opacity-65 enabled:hover:-translate-y-0.5"
            disabled={loading}
            onClick={onStart}
            type="button"
          >
            {loading ? "Đang tạo tài khoản…" : "Bắt đầu làm quen cùng Emsen"}
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={17} />
          </button>
        </div>

        <button
          className="mx-auto mt-5 flex items-center gap-2 text-xs font-bold text-[#829782] transition hover:text-[#46A82D]"
          disabled={loading}
          onClick={onBack}
          type="button"
        >
          <ArrowLeft size={14} />
          Quay lại thông tin đăng ký
        </button>
      </div>
    </div>
  );
}
