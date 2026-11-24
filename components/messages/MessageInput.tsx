"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal, Loader2, Reply, X } from "lucide-react";

import { sendDirectMessage } from "@/lib/dm/actions";
import type { DirectMessagePayload } from "@/lib/dm/types";

export interface ReplyTarget {
  id: string;
  senderName: string;
  content: string | null;
  hasMedia?: boolean;
}

interface MessageInputProps {
  conversationId: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onMessageSent?: (message: DirectMessagePayload) => void;
  onBlockError?: () => void;
  replyingTo?: ReplyTarget | null;
  onCancelReply?: () => void;
}

export default function MessageInput({
  conversationId,
  draft,
  onDraftChange,
  onTypingChange,
  onMessageSent,
  onBlockError,
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sendingRef = useRef(false);
  const isTypingRef = useRef(false);
  const lastTypingSentRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // فوکوس خودکار روی اینپوت هنگام انتخاب ریپلای
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const stopTyping = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    if (!isTypingRef.current) return;

    isTypingRef.current = false;
    onTypingChange?.(false);
  }, [onTypingChange]);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
      }
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onDraftChange(value);

    if (!value.trim()) {
      stopTyping();
      return;
    }

    const now = Date.now();

    if (!isTypingRef.current || now - lastTypingSentRef.current >= 1500) {
      isTypingRef.current = true;
      lastTypingSentRef.current = now;
      onTypingChange?.(true);
    }

    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
    }

    stopTimerRef.current = setTimeout(stopTyping, 2500);
  };

  const handleSend = () => {
    if (!draft.trim() || isPending || sendingRef.current) return;

    const currentText = draft.trim();
    const replyTargetId = replyingTo?.id;

    sendingRef.current = true;
    stopTyping();

    startTransition(async () => {
      try {
        const result = await sendDirectMessage({
          conversationId,
          content: currentText,
          replyToId: replyTargetId,
        });

        if (result.status === "blocked") {
          onBlockError?.();
          return;
        }

        try {
          onMessageSent?.(result.message as unknown as DirectMessagePayload);
        } catch (error) {
          console.error("[DM Input] Post-send UI callback failed:", error);
        }

        onDraftChange("");
        onCancelReply?.();
        router.refresh();
      } catch (error) {
        console.error("[DM Input] Send failed:", error);
        alert(
          error instanceof Error
            ? error.message
            : "خطا در ارسال پیام."
        );
      } finally {
        sendingRef.current = false;
      }
    });
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    } else if (event.key === "Escape" && replyingTo) {
      onCancelReply?.();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* بنر پیش‌نمایش ریپلای (Telegram-Style) */}
      {replyingTo && (
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 backdrop-blur-sm transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Reply className="h-4 w-4 -scale-x-100" />
            </div>
            <div className="flex min-w-0 flex-col text-xs">
              <span className="font-semibold text-primary truncate">
                {replyingTo.senderName}
              </span>
              <span className="truncate text-muted-foreground">
                {replyingTo.content || (replyingTo.hasMedia ? "📷 پیوست چندرسانه‌ای" : "...")}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ورودی متن پیام */}
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          placeholder="Start a new message..."
          disabled={isPending}
          className="flex-1 rounded-full border border-border bg-muted/70 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || isPending}
          aria-label="Send message"
          className="shrink-0 rounded-full bg-primary p-2.5 text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
