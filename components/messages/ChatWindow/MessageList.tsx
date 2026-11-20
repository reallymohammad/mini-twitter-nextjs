"use client";

import {
  memo,
  useMemo,
  type RefObject,
  type UIEventHandler,
} from "react";
import { ChevronDown } from "lucide-react";

import MessageGroup from "./MessageGroup";
import type { MessageItem } from "./useChatRealtime";

interface MessageListProps {
  messages: MessageItem[];
  currentUserId: string;
  isRecipientTyping: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  onScroll: UIEventHandler<HTMLDivElement>;
  showScrollBottomButton: boolean;
  onScrollToBottom: () => void;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function MessageList({
  messages,
  currentUserId,
  isRecipientTyping,
  containerRef,
  endRef,
  onScroll,
  showScrollBottomButton,
  onScrollToBottom,
}: MessageListProps) {
  const groupedMessages = useMemo(() => {
    const groups: {
      dateKey: string;
      dateLabel: string;
      items: MessageItem[];
    }[] = [];

    const today = new Date();
    const yesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1
    );

    const todayKey = getLocalDateKey(today);
    const yesterdayKey = getLocalDateKey(yesterday);

    for (const message of messages) {
      const date = new Date(message.createdAt);
      const dateKey = getLocalDateKey(date);

      let dateLabel = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (dateKey === todayKey) dateLabel = "Today";
      else if (dateKey === yesterdayKey) {
        dateLabel = "Yesterday";
      }

      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.dateKey === dateKey) {
        lastGroup.items.push(message);
      } else {
        groups.push({
          dateKey,
          dateLabel,
          items: [message],
        });
      }
    }

    return groups;
  }, [messages]);

  return (
    <>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 space-y-6 overflow-y-auto px-4 py-3"
      >
        {groupedMessages.map((group) => (
          <MessageGroup
            key={group.dateKey}
            dateLabel={group.dateLabel}
            items={group.items}
            currentUserId={currentUserId}
          />
        ))}

        {isRecipientTyping && (
          <div className="flex items-center gap-2 px-2 py-1 text-xs italic text-muted-foreground">
            <div className="flex items-center space-x-1 rounded-2xl border border-border/40 bg-muted/60 px-3 py-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {showScrollBottomButton && (
        <button
          type="button"
          onClick={onScrollToBottom}
          className="absolute bottom-20 right-5 z-20 rounded-full bg-primary p-2.5 text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}
    </>
  );
}

export default memo(MessageList);
