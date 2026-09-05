import type { ChatMessageDto, ChatStateDto } from "@creator-flow/contracts";
import {
  ArrowUp,
  BrainCircuit,
  LoaderCircle,
  Minus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmsenAvatar } from "../../components/branding/EmsenAvatar";
import { EmsenMark } from "../../components/branding/EmsenMark";
import { getChat, sendChatMessage } from "./chatApi";
import {
  chatDraftStorageKey,
  creatorDnaUpdatedEvent,
  formatChatMessageTime,
} from "./chatConfig";

type ChatAssistantProps = {
  currentPage: string;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  preferencesRevision: number;
};

const quickPrompts = [
  "Mình đang có một ý tưởng mới",
  "Giúp mình phát triển một concept",
  "Mình cần hỗ trợ viết kịch bản",
];

function AssistantMessage({ message }: { message: ChatMessageDto }) {
  return (
    <div className="chat-message-enter flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border border-[#DDEBD6] bg-[#F3FAEE] shadow-[0_6px_16px_rgba(70,168,45,0.13)]">
        <EmsenAvatar emotion="content" alt="Emsen" className="h-10 w-10" />
      </div>
      <div className="min-w-0 flex-1">
        {message.collectionIntent ? (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#F0F8EC] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.11em] text-[#4C9355]">
            <BrainCircuit size={12} />
            Câu hỏi làm giàu Creator DNA
          </div>
        ) : null}
        <p className="whitespace-pre-line text-sm leading-6 text-[#624C4D]">
          {message.content}
        </p>
        {message.learnedSignals.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-[#DCE9D7] bg-[#F6FAF4] p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#4C9355]">
              <Sparkles size={12} />
              Creator DNA vừa ghi nhớ
            </p>
            <div className="mt-2 space-y-1.5">
              {message.learnedSignals.map((signal) => (
                <p className="text-[11px] leading-5 text-[#657562]" key={signal.id}>
                  <span className="font-bold">{signal.category}:</span> {signal.summary}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        <p className="mt-1.5 text-[10px] text-[#91A38F]">
          {formatChatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: ChatMessageDto }) {
  return (
    <div className="chat-message-enter flex justify-end">
      <div className="max-w-[86%]">
        <div className="whitespace-pre-line rounded-2xl rounded-br-md bg-[#284D31] px-4 py-3 text-sm leading-6 text-white shadow-[0_8px_20px_rgba(40,77,49,0.12)]">
          {message.content}
        </div>
        <p className="mt-1.5 text-right text-[10px] text-[#91A38F]">
          {formatChatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function ChatAssistant({
  currentPage,
  open,
  onClose,
  onOpen,
  preferencesRevision,
}: ChatAssistantProps) {
  const [chat, setChat] = useState<ChatStateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem(chatDraftStorageKey) ?? "",
  );
  const messageEndRef = useRef<HTMLDivElement>(null);

  const loadChat = useCallback(async () => {
    setError("");
    try {
      setChat(await getChat());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Chưa thể tải cuộc trò chuyện.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadChat();
  }, [loadChat, preferencesRevision]);

  useEffect(() => {
    const onFocus = () => void loadChat();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadChat]);

  useEffect(() => {
    const nextAt = chat?.preferences.nextProactiveAt;
    if (!nextAt) {
      return;
    }
    const delay = Math.max(1_000, new Date(nextAt).getTime() - Date.now());
    const timeout = window.setTimeout(
      () => void loadChat(),
      Math.min(delay, 2_147_000_000),
    );
    return () => window.clearTimeout(timeout);
  }, [chat?.preferences.nextProactiveAt, loadChat]);

  useEffect(() => {
    window.localStorage.setItem(chatDraftStorageKey, draft);
  }, [draft]);

  useEffect(() => {
    if (open) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chat?.messages, open, sending]);

  const submitMessage = async (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || sending) {
      return;
    }
    setSending(true);
    setError("");
    setDraft("");
    const optimisticMessage: ChatMessageDto = {
      collectionIntent: null,
      content: trimmedContent,
      createdAt: new Date().toISOString(),
      id: `pending-${Date.now()}`,
      learnedSignals: [],
      model: null,
      provider: null,
      role: "user",
    };
    setChat((current) =>
      current
        ? { ...current, messages: [...current.messages, optimisticMessage] }
        : current,
    );

    try {
      const result = await sendChatMessage(trimmedContent, currentPage);
      if (result.assistantMessage.learnedSignals.length > 0) {
        window.dispatchEvent(new CustomEvent(creatorDnaUpdatedEvent));
      }
      setChat((current) =>
        current
          ? {
              ...current,
              messages: [
                ...current.messages.filter(({ id }) => id !== optimisticMessage.id),
                result.userMessage,
                result.assistantMessage,
              ],
              preferences: result.preferences,
            }
          : current,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Chưa thể gửi tin nhắn.",
      );
      setDraft(trimmedContent);
      setChat((current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter(({ id }) => id !== optimisticMessage.id),
            }
          : current,
      );
    } finally {
      setSending(false);
    }
  };

  const messages = chat?.messages ?? [];
  const aiLabel = chat?.ai.configured ? "Gemini" : "Fallback";

  return (
    <>
      <button
        aria-label="Mở emsen buddy"
        className={`fixed bottom-5 right-5 z-[55] flex h-14 items-center gap-3 rounded-2xl bg-gradient-to-r from-[#46A82D] to-[#82C95B] px-4 text-white shadow-[0_18px_38px_rgba(70,168,45,0.32)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(70,168,45,0.38)] sm:bottom-6 sm:right-6 ${
          open ? "pointer-events-none translate-y-3 scale-75 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={onOpen}
        type="button"
      >
        <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/85">
          <EmsenAvatar alt="Emsen" className="h-11 w-11" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#388D37] bg-[#67B86F]" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-bold">emsen buddy</span>
          <span className="mt-0.5 block text-[10px] text-white/75">
            Hội thoại được lưu theo tài khoản
          </span>
        </span>
      </button>

      <aside
        aria-hidden={!open}
        aria-label="emsen buddy"
        className={`fixed bottom-3 left-3 right-3 z-[60] flex h-[72vh] flex-col overflow-hidden rounded-[26px] border border-[#D5E6CF] bg-white/98 shadow-[0_28px_80px_rgba(40,77,49,0.24)] backdrop-blur-xl transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:left-auto sm:right-4 sm:w-[420px] lg:bottom-0 lg:right-0 lg:top-0 lg:h-screen lg:w-[440px] lg:rounded-none lg:border-y-0 lg:border-r-0 ${
          open
            ? "translate-x-0 translate-y-0 opacity-100"
            : "pointer-events-none translate-y-[110%] opacity-0 sm:translate-x-[110%] sm:translate-y-0"
        }`}
      >
        <header className="flex h-[76px] shrink-0 items-center border-b border-[#DDEBD6] bg-white/90 px-4 sm:px-5">
          <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#EAF6E4] to-[#EEF8EF]">
            <EmsenMark size={38} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#67B86F]" />
          </div>
          <div className="ml-3 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-bold text-[#284D31]">emsen buddy</h2>
              <span className="rounded-full bg-[#EEF8EF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#3F7E49]">
                {aiLabel}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#829782]">Đang xem · {currentPage}</p>
          </div>
          <button
            aria-label="Thu nhỏ emsen buddy"
            className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-[#D7E7D1] text-[#607760] transition hover:border-[#82C95B] hover:bg-[#F1F8EC] hover:text-[#46A82D]"
            onClick={onClose}
            type="button"
          >
            <Minus size={19} />
          </button>
        </header>

        <div className="flow-scrollbar flex-1 overflow-y-auto bg-gradient-to-b from-[#FFFDF8] to-white px-4 py-5 sm:px-5">
          {loading && messages.length === 0 ? (
            <div className="grid min-h-48 place-items-center text-center">
              <div>
                <LoaderCircle className="mx-auto animate-spin text-[#46A82D]" size={26} />
                <p className="mt-3 text-xs font-semibold text-[#748A74]">Đang mở cuộc trò chuyện…</p>
              </div>
            </div>
          ) : (
            <div aria-live="polite" className="space-y-5">
              {messages.map((message) =>
                message.role === "assistant" ? (
                  <AssistantMessage key={message.id} message={message} />
                ) : (
                  <UserMessage key={message.id} message={message} />
                ),
              )}
              {sending ? (
                <div className="flex items-center gap-3 text-xs font-semibold text-[#829782]">
                  <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#F3FAEE]">
                    <EmsenAvatar emotion="wonder" alt="Emsen đang suy nghĩ" className="h-10 w-10" />
                    <LoaderCircle className="absolute -bottom-1 -right-1 animate-spin rounded-full bg-white p-0.5 text-[#46A82D]" size={15} />
                  </div>
                  emsen đang suy nghĩ và đọc Creator DNA…
                </div>
              ) : null}
            </div>
          )}

          {messages.length <= 2 && !loading ? (
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A794]">
                Bắt đầu nhanh
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    className="rounded-xl border border-[#D5E6CF] bg-white px-3 py-2 text-left text-xs font-semibold text-[#526952] transition hover:-translate-y-0.5 hover:border-[#82C95B] hover:text-[#46A82D] hover:shadow-sm"
                    key={prompt}
                    onClick={() => void submitMessage(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#FFD6D2] bg-[#FFF5F3] px-3.5 py-3 text-xs font-semibold text-[#B9534D]">
              <span>{error}</span>
              <button
                aria-label="Tải lại cuộc trò chuyện"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white"
                onClick={() => void loadChat()}
                type="button"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          ) : null}
          <div ref={messageEndRef} />
        </div>

        <form
          className="shrink-0 border-t border-[#DDEBD6] bg-white p-3.5 sm:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitMessage(draft);
          }}
        >
          <div className="overflow-hidden rounded-[20px] border border-[#D5E6CF] bg-[#FFFDF8] p-2 shadow-[0_8px_24px_rgba(40,77,49,0.06)] transition focus-within:border-[#82C95B] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#82C95B]/10">
            <textarea
              aria-label="Nhắn cho emsen buddy"
              className="chat-composer-textarea flow-scrollbar block max-h-28 min-h-12 w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-5 text-[#31583A] outline-none placeholder:text-[#91A38F] focus:outline-none focus-visible:outline-none"
              disabled={loading}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitMessage(draft);
                }
              }}
              placeholder="Kể một ý tưởng, gửi brief hoặc hỏi emsen…"
              rows={2}
              value={draft}
            />
            <div className="flex items-center justify-between gap-3 px-1 pb-1">
              <p className="text-[10px] text-[#91A38F]">
                Enter để gửi · Câu trả lời có thể làm giàu Creator DNA
              </p>
              <button
                aria-label="Gửi tin nhắn"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#46A82D] to-[#82C95B] text-white shadow-[0_7px_16px_rgba(70,168,45,0.22)] transition disabled:cursor-not-allowed disabled:opacity-35 enabled:hover:-translate-y-0.5"
                disabled={!draft.trim() || sending || loading}
                type="submit"
              >
                {sending ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <ArrowUp size={17} strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[9px] text-[#9CAF98]">
            emsen buddy có thể mắc lỗi. Hãy kiểm tra nội dung quan trọng.
          </p>
        </form>
      </aside>
    </>
  );
}
