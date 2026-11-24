"use client";

import type { RefObject } from "react";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DirectMessage } from "./types";

const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageReactionsProps {
  reactions: DirectMessage["reactions"];
  currentUserId: string;
  isMine: boolean;
  showReactionPicker: boolean;
  isReactionPending: boolean;
  pickerRef: RefObject<HTMLDivElement | null>;
  onEmojiClick: (emoji: string) => void;
}

export default function MessageReactions({
  reactions,
  currentUserId,
  isMine,
  showReactionPicker,
  isReactionPending,
  pickerRef,
  onEmojiClick,
}: MessageReactionsProps) {
  // گروه‌بندی بر اساس ایموجی بدون شمارش عددی
  const groupedReactions = (reactions ?? []).reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = { hasReacted: false };
      }

      if (reaction.userId === currentUserId) {
        acc[reaction.emoji].hasReacted = true;
      }

      return acc;
    },
    {} as Record<string, { hasReacted: boolean }>
  );

  const reactionEntries = Object.entries(groupedReactions);

  return (
    <>
      {/* پنل انتخاب سریع ایموجی با انیمیشن روان و سایه حرفه‌ای */}
      {showReactionPicker && (
        <div
          ref={pickerRef}
          className={cn(
            "absolute bottom-full mb-2 z-30 flex items-center gap-1.5 rounded-full border border-border/80 bg-background/95 px-3 py-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150",
            isMine ? "end-0" : "start-0"
          )}
        >
          {ALLOWED_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              disabled={isReactionPending}
              onClick={() => onEmojiClick(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-base transition-transform hover:scale-125 hover:bg-muted focus:outline-none disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* لیست ری‌اکشن‌های ثبت‌شده بدون هیچ‌گونه عدد یا شمارنده */}
      {reactionEntries.length > 0 && (
        <div
          className={cn(
            "mt-1 flex flex-wrap gap-1.5",
            isMine ? "justify-end" : "justify-start"
          )}
        >
          {reactionEntries.map(([emoji, { hasReacted }]) => (
            <button
              key={emoji}
              type="button"
              role="button"
              aria-label={emoji}
              aria-pressed={hasReacted}
              disabled={isReactionPending}
              onClick={() => onEmojiClick(emoji)}
              className={cn(
                "group inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50",
                hasReacted
                  ? "border-primary/50 bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                  : "border-border/80 bg-background/90 text-foreground/80 hover:bg-muted hover:border-border"
              )}
            >
              <span className="text-sm leading-none">{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
