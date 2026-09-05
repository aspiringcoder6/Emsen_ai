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
  onSkip: () => void;
  onStart: () => void;
};

const benefits = [
  "Nội dung đầu tiên bớt chung chung hơn",
  "Ghi nhận phong cách và những điều bạn muốn tránh",
  "Tiếp tục học dần từ câu chuyện và phản hồi của bạn",
];

export function SignupCreatorDnaChoice({
  displayName,
  error,
  loading,
  onBack,
  onSkip,
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
            Bước tùy chọn
          </span>
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-[#DDF3D3]">
          Tài khoản đã sẵn sàng
        </p>
        <h2 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.04em]">
          {displayName}, để emsen hiểu bạn ngay từ đầu nhé?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#DCEED9]">
          Trả lời 6 câu hỏi nhỏ để tạo điểm khởi đầu cho Creator DNA. Bạn cũng có thể bỏ
          qua và emsen sẽ tìm hiểu dần khi cùng làm nội dung.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold text-[#46A82D]">
          <Clock3 size={15} />
          Khoảng 3 phút · có thể dừng bất cứ lúc nào
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
            Tài khoản và Creator DNA được lưu trên backend. Google API key chỉ nằm ở máy
            chủ và không bao giờ được gửi xuống trình duyệt.
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
            {loading ? "Đang tạo tài khoản và đánh giá…" : "Bắt đầu thiết lập Creator DNA"}
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={17} />
          </button>
          <button
            className="h-11 w-full rounded-2xl border border-[#D6E5D0] text-sm font-bold text-[#607760] transition disabled:cursor-wait disabled:opacity-50 enabled:hover:border-[#82C95B] enabled:hover:bg-[#F7FBF3] enabled:hover:text-[#46A82D]"
            disabled={loading}
            onClick={onSkip}
            type="button"
          >
            Bỏ qua, vào workspace
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
