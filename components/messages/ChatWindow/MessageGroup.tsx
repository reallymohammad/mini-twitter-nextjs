"use client";

import MessageBubble from "../MessageBubble";
import type { ReplyTarget } from "../MessageInput";
import type { MessageItem } from "./useChatRealtime";

interface MessageGroupProps {
  dateLabel: string;
  items: MessageItem[];
  currentUserId: string;
  onMessageDeleted: (messageId: string) => void;
  selectionMode: boolean;
  selectedMessageIds: ReadonlySet<string>;
  onToggleMessageSelected: (messageId: string) => void;
  onStartSelection: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => Promise<unknown>;
  onReply: (target: ReplyTarget) => void;
  onScrollToMessage: (messageId: string) => void;
}

export default function MessageGroup({
  dateLabel,
  items,
  currentUserId,
  onMessageDeleted,
  selectionMode,
  selectedMessageIds,
  onToggleMessageSelected,
  onStartSelection,
  onToggleReaction,
  onReply,
  onScrollToMessage,
}: MessageGroupProps) {
  return (
    <section>
      <div className="mb-4 flex justify-center">
        <span className="rounded-full border border-border bg-background/90 px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
          {dateLabel}
        </span>
      </div>

      {items.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          isMine={message.senderId === currentUserId}
          onDeleted={onMessageDeleted}
          selectionMode={selectionMode}
          isSelected={selectedMessageIds.has(message.id)}
          onToggleSelected={onToggleMessageSelected}
          onStartSelection={onStartSelection}
          onToggleReaction={onToggleReaction}
          onReply={onReply}
          onScrollToMessage={onScrollToMessage}
        />
      ))}
    </section>
  );
}
