import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EmsenMark } from "../../../components/branding/EmsenMark";
import type { AuthRequest } from "../../../types/app";
import { SignupCreatorDnaChoice } from "./SignupCreatorDnaChoice";

type AuthMode = "login" | "signup";

type AuthFormPanelProps = {
  onAuthenticate: (request: AuthRequest) => Promise<void>;
};

export function AuthFormPanel({ onAuthenticate }: AuthFormPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [pendingSignup, setPendingSignup] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (pendingSignup) {
      window.scrollTo({ behavior: "smooth", top: 0 });
    }
  }, [pendingSignup]);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setPendingSignup(false);
    setSubmitting(false);
  };

  const submitAuth = async () => {
    const normalizedEmail = email.trim().toLocaleLowerCase("vi-VN");
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Vui lòng nhập một địa chỉ email hợp lệ.");
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu cần có ít nhất 8 ký tự.");
      return;
    }

    if (mode === "signup") {
      if (name.trim().length < 2) {
        setError("Vui lòng nhập tên hiển thị của bạn.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận chưa khớp.");
        return;
      }

      if (!acceptedTerms) {
        setError("Bạn cần đồng ý với điều khoản sử dụng để tiếp tục.");
        return;
      }
    }

    if (mode === "signup") {
      setError("");
      setPendingSignup(true);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onAuthenticate({
        email: normalizedEmail,
        password,
        remember,
        source: "login",
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đăng nhập.");
    } finally {
      setSubmitting(false);
    }
  };

  const completeSignup = async (creatorDna: "start" | "skip") => {
    setSubmitting(true);
    setError("");
    try {
      await onAuthenticate({
        acceptedTerms,
        creatorDna,
        email: email.trim().toLocaleLowerCase("vi-VN"),
        name: name.trim(),
        password,
        source: "signup",
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-12">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[54px] border-[#82C95B]/5" />
      <div className="absolute -bottom-32 left-[8%] h-96 w-96 rounded-[45%_55%_62%_38%/51%_40%_60%_49%] border border-[#67B86F]/15" />

      <div className="relative z-10 w-full max-w-[450px]">
        <div className="mb-7 flex items-center justify-center lg:hidden">
          <EmsenMark full size={74} />
        </div>

        {pendingSignup ? (
          <SignupCreatorDnaChoice
            displayName={name.trim()}
            error={error}
            loading={submitting}
            onBack={() => {
              setError("");
              setPendingSignup(false);
            }}
            onSkip={() => void completeSignup("skip")}
            onStart={() => void completeSignup("start")}
          />
        ) : (
          <div className="rounded-[28px] border border-[#D8E8D2] bg-white/90 p-5 shadow-[0_28px_80px_rgba(40,77,49,0.1)] backdrop-blur-xl sm:p-8">
          <div className="grid grid-cols-2 rounded-2xl bg-[#EFF8E9] p-1.5">
            <button
              className={`h-10 rounded-xl text-sm font-bold transition-all duration-300 ${
                mode === "login"
                  ? "bg-white text-[#46A82D] shadow-[0_5px_16px_rgba(40,77,49,0.09)]"
                  : "text-[#748A74] hover:text-[#31583A]"
              }`}
              onClick={() => changeMode("login")}
              type="button"
            >
              Đăng nhập
            </button>
            <button
              className={`h-10 rounded-xl text-sm font-bold transition-all duration-300 ${
                mode === "signup"
                  ? "bg-white text-[#46A82D] shadow-[0_5px_16px_rgba(40,77,49,0.09)]"
                  : "text-[#748A74] hover:text-[#31583A]"
              }`}
              onClick={() => changeMode("signup")}
              type="button"
            >
              Tạo tài khoản
            </button>
          </div>

          <div className="auth-form-enter mt-7" key={mode}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#46A82D]">
              {mode === "login" ? "Mừng bạn trở lại" : "Gieo một khởi đầu mới"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#284D31]">
              {mode === "login" ? "Đăng nhập workspace" : "Tạo tài khoản"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#829782]">
              {mode === "login"
                ? "Tiếp tục công việc đang dang dở của bạn."
                : "Thiết lập tài khoản để bắt đầu quản lý nội dung."}
            </p>

            <form
              className="mt-7 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitAuth();
              }}
            >
              {mode === "signup" ? (
                <label className="block">
                  <span className="text-xs font-bold text-[#526952]">Tên hiển thị</span>
                  <div className="relative mt-2">
                    <UserRound
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A794]"
                      size={18}
                    />
                    <input
                      autoComplete="name"
                      className="h-12 w-full rounded-2xl border border-[#D7E7D1] bg-[#FFFDF8] pl-11 pr-4 text-sm text-[#31583A] outline-none transition placeholder:text-[#9CAF98] focus:border-[#82C95B] focus:bg-white focus:ring-4 focus:ring-[#82C95B]/10"
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ví dụ: Hiếu Nguyễn"
                      value={name}
                    />
                  </div>
                </label>
              ) : null}

              <label className="block">
                <span className="text-xs font-bold text-[#526952]">Email</span>
                <div className="relative mt-2">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A794]"
                    size={18}
                  />
                  <input
                    autoComplete="email"
                    className="h-12 w-full rounded-2xl border border-[#D7E7D1] bg-[#FFFDF8] pl-11 pr-4 text-sm text-[#31583A] outline-none transition placeholder:text-[#9CAF98] focus:border-[#82C95B] focus:bg-white focus:ring-4 focus:ring-[#82C95B]/10"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    type="email"
                    value={email}
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[#526952]">Mật khẩu</span>
                <div className="relative mt-2">
                  <LockKeyhole
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A794]"
                    size={18}
                  />
                  <input
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="h-12 w-full rounded-2xl border border-[#D7E7D1] bg-[#FFFDF8] pl-11 pr-12 text-sm text-[#31583A] outline-none transition placeholder:text-[#9CAF98] focus:border-[#82C95B] focus:bg-white focus:ring-4 focus:ring-[#82C95B]/10"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#94A794] transition hover:bg-[#E3F2DB] hover:text-[#46A82D]"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              {mode === "signup" ? (
                <label className="block">
                  <span className="text-xs font-bold text-[#526952]">
                    Xác nhận mật khẩu
                  </span>
                  <div className="relative mt-2">
                    <ShieldCheck
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A794]"
                      size={18}
                    />
                    <input
                      autoComplete="new-password"
                      className="h-12 w-full rounded-2xl border border-[#D7E7D1] bg-[#FFFDF8] pl-11 pr-4 text-sm text-[#31583A] outline-none transition placeholder:text-[#9CAF98] focus:border-[#82C95B] focus:bg-white focus:ring-4 focus:ring-[#82C95B]/10"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                    />
                  </div>
                </label>
              ) : null}

              {mode === "login" ? (
                <div className="flex items-center justify-between gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#607760]">
                    <input
                      checked={remember}
                      className="h-4 w-4 rounded border-[#BED6B7] accent-[#46A82D]"
                      onChange={(event) => setRemember(event.target.checked)}
                      type="checkbox"
                    />
                    Ghi nhớ đăng nhập
                  </label>
                  <button className="text-xs font-bold text-[#46A82D]" type="button">
                    Quên mật khẩu?
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-[#607760]">
                  <input
                    checked={acceptedTerms}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#BED6B7] accent-[#46A82D]"
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    type="checkbox"
                  />
                  Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của emsen.
                </label>
              )}

              {error ? (
                <div
                  className="rounded-xl border border-[#FFD2D2] bg-[#FFF4F4] px-3.5 py-3 text-xs font-semibold text-[#B83F3F]"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <button
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#46A82D] to-[#82C95B] text-sm font-bold text-white shadow-[0_12px_28px_rgba(70,168,45,0.24)] transition disabled:cursor-wait disabled:opacity-65 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_16px_34px_rgba(70,168,45,0.3)]"
                disabled={submitting}
                type="submit"
              >
                {submitting
                  ? "Đang kết nối…"
                  : mode === "login"
                    ? "Vào workspace"
                    : "Tạo tài khoản"}
                <ArrowRight
                  className="transition-transform group-hover:translate-x-0.5"
                  size={17}
                />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-[#829782]">
              {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
              <button
                className="font-bold text-[#46A82D] hover:underline"
                onClick={() => changeMode(mode === "login" ? "signup" : "login")}
                type="button"
              >
                {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </p>
          </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2 text-center text-[10px] text-[#94A794]">
          <ShieldCheck size={13} />
          Tài khoản và Creator DNA được lưu an toàn trên backend.
        </div>
      </div>
    </section>
  );
}
