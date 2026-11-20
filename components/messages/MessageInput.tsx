"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal, Loader2 } from "lucide-react";

import { sendDirectMessage } from "@/lib/dm/actions";
import type { DirectMessagePayload } from "@/lib/dm/types";

interface MessageInputProps {
  conversationId: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onMessageSent?: (message: DirectMessagePayload) => void;
  onBlockError?: () => void;
}

export default function MessageInput({
  conversationId,
  draft,
  onDraftChange,
  onTypingChange,
  onMessageSent,
  onBlockError,
}: MessageInputProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sendingRef = useRef(false);
  const isTypingRef = useRef(false);
  const lastTypingSentRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    sendingRef.current = true;
    stopTyping();

    startTransition(async () => {
      try {
        const result = await sendDirectMessage({
          conversationId,
          content: currentText,
        });

        if (result.status === "blocked") {
          onBlockError?.();
          return;
        }

        // شکست callback نباید پیام ذخیره‌شده را «ارسال‌نشده» جلوه دهد.
        try {
          onMessageSent?.(result.message);
        } catch (error) {
          console.error("[DM Input] Post-send UI callback failed:", error);
        }

        onDraftChange("");
        router.refresh();
      } catch (error) {
        // فقط خطاهای غیرمنتظره اینجا ثبت می‌شوند.
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
    }
  };

  return (
    <div className="border-t border-border bg-background/80 p-3 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-2">
        <input
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
