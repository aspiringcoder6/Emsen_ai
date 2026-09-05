import { useEffect, useState } from "react";
import type { AiKeySettingsDto } from "@creator-flow/contracts";
import { ExternalLink, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";

export function GoogleAiKeySettings({ onChanged }: { onChanged: () => void }) {
  const [settings, setSettings] = useState<AiKeySettingsDto | null>(null);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try { setSettings(await apiRequest<AiKeySettingsDto>("/settings/ai-key")); }
    catch (error) { setError(error instanceof Error ? error.message : "Chưa tải được cấu hình AI."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const update = async (remove: boolean) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await apiRequest<AiKeySettingsDto>("/settings/ai-key", remove ? { method: "DELETE" } : { method: "PUT", body: { apiKey: key.trim() } });
      setSettings(result); setKey(""); onChanged();
      setNotice(remove ? "Đã gỡ key cá nhân khỏi emsen. Key ở Google AI Studio vẫn tồn tại." : "Đã kết nối và lưu key. Các tính năng AI sẽ dùng key cá nhân của bạn.");
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa cập nhật được API key."); }
    finally { setBusy(false); }
  };
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#DDEBD6] bg-white p-5 sm:p-8">
      <div className="flex items-start gap-3"><span className="rounded-2xl bg-[#FFF0ED] p-3 text-[#B46263]"><KeyRound size={24} /></span><div><p className="text-xs font-bold uppercase tracking-widest text-[#AA6260]">Kết nối Google AI</p><h2 className="mt-1 text-2xl font-bold">Một chiếc chìa khóa cho emsen.</h2><p className="mt-2 text-sm leading-6 text-[#748A74]">Dùng API key của bạn cho chat, Creator DNA, định hướng và kế hoạch nội dung.</p></div></div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-[#F5F9F1] p-5 text-sm leading-6 text-[#63795E]">
          <h3 className="font-bold text-[#466D47]">Lấy API key như thế nào?</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Mở Google AI Studio và đăng nhập tài khoản Google.</li>
            <li>Vào mục <strong>API Keys</strong> trong Dashboard. Chọn <strong>Create API key</strong>, rồi chọn hoặc tạo project.</li>
            <li>Nếu chưa thấy project sẵn có, vào <strong>Projects → Import projects</strong> để thêm project trước.</li>
            <li>Sao chép key, dán vào ô bên cạnh rồi chọn <strong>Kiểm tra & lưu</strong>.</li>
          </ol>
          <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-[#466D47]">Mở Google AI Studio <ExternalLink size={14} /></a>
          <p className="mt-3 text-xs">Hạn mức miễn phí tùy model, project và khu vực. Lượt sử dụng có thể tính phí nếu project bật thanh toán; emsen không tự bật thanh toán.</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs underline"><a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noreferrer">Hướng dẫn Google</a><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer">Hạn mức & thanh toán</a></div>
        </div>
        <div>
          {loading ? <p className="text-sm text-[#748A74]">Đang tải kết nối…</p> : <>
            <p className="rounded-xl bg-[#FFF7F3] p-3 text-sm font-semibold">{settings?.source === "personal" ? `Đang dùng key cá nhân ${settings.maskedKey}` : settings?.source === "workspace" ? "Đang dùng kết nối chung của workspace" : "Chưa có kết nối AI"}</p>
            {settings && <p className="mt-2 text-xs text-[#748A74]">Model: {settings.model}{settings.updatedAt ? ` · Cập nhật ${new Date(settings.updatedAt).toLocaleDateString("vi-VN")}` : ""}</p>}
            <form className="mt-5" onSubmit={(event) => { event.preventDefault(); void update(false); }}>
              <label className="block text-sm font-bold">Google API key<input type="password" autoComplete="off" spellCheck={false} maxLength={256} value={key} disabled={busy} onChange={(event) => { setKey(event.target.value); setNotice(""); }} placeholder={settings?.hasPersonalKey ? "Dán key mới để thay thế" : "Dán API key của bạn"} className="mt-2 w-full rounded-xl border border-[#E5D3CD] bg-[#FFFDF8] px-4 py-3 font-normal" /></label>
              <p className="mt-2 text-xs leading-5 text-[#748A74]">Kiểm tra gửi một yêu cầu ngắn tới Google và dùng một lượng nhỏ hạn mức API. Key chỉ được lưu nếu kết nối thành công.</p>
              <button type="submit" disabled={busy || key.trim().length < 20 || !settings} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#284D31] px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}{busy ? "Đang kiểm tra…" : "Kiểm tra & lưu"}</button>
            </form>
            {settings?.hasPersonalKey && <button type="button" disabled={busy} onClick={() => void update(true)} className="mt-3 rounded-lg px-2 py-1 text-xs font-bold text-[#417F40]">Gỡ key cá nhân · dùng kết nối chung nếu có</button>}
          </>}
          <p className="mt-4 text-xs leading-5 text-[#748A74]">Key được mã hóa khi lưu trên máy chủ, không được lưu trong trình duyệt và không hiển thị lại toàn bộ. Chỉ tài khoản của bạn được sử dụng key này.</p>
        </div>
      </div>
      {notice && <p role="status" className="mt-4 rounded-xl bg-[#F0F7EB] p-3 text-sm text-[#466D47]">{notice}</p>}
      {error && <div role="alert" className="mt-4 rounded-xl bg-[#EAF6E4] p-3 text-sm text-[#417F40]">{error}{!settings && <button type="button" onClick={() => void load()} className="ml-3 font-bold underline">Thử tải lại</button>}</div>}
    </section>
  );
}
