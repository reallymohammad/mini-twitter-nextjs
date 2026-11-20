"use client";

import { memo } from "react";

import MessageBubble from "../MessageBubble";
import type { MessageItem } from "./useChatRealtime";

interface MessageGroupProps {
  dateLabel: string;
  items: MessageItem[];
  currentUserId: string;
}

function MessageGroup({
  dateLabel,
  items,
  currentUserId,
}: MessageGroupProps) {
  return (
    <div className="space-y-3">
      <div className="my-2 flex justify-center">
        <span className="rounded-full border border-border/40 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
          {dateLabel}
        </span>
      </div>

      {items.map((message) => (
        <MessageBubble
          key={message.id}
          isMine={message.senderId === currentUserId}
          message={{
            id: message.id,
            senderId: message.senderId,
            content: message.content,
            mediaUrls: message.mediaUrls,
            createdAt: message.createdAt,
            isSeen: message.isSeen,
          }}
        />
      ))}
    </div>
  );
}

export default memo(MessageGroup);
