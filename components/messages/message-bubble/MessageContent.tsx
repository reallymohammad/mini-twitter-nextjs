"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { DirectMessage } from "./types";

interface MessageContentProps {
  message: DirectMessage;
  isMine: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  onScrollToMessage?: (messageId: string) => void;
}

export default function MessageContent({
  message,
  isMine,
  selectionMode,
  isSelected,
  onScrollToMessage,
}: MessageContentProps) {
  const t = useTranslations("Settings.Messages");

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
        isMine
          ? "rounded-br-sm bg-primary text-primary-foreground"
          : "rounded-bl-sm border border-border bg-muted text-foreground",
        selectionMode &&
          isSelected &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {message.replyTo && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onScrollToMessage?.(message.replyTo!.id);
          }}
          className={cn(
            "mb-1 flex flex-col rounded-lg border-s-2 px-2.5 py-1 text-start text-xs transition hover:opacity-85",
            isMine
              ? "border-primary-foreground/70 bg-black/15 text-primary-foreground"
              : "border-primary bg-background/80 text-foreground"
          )}
        >
          <span className="truncate text-[11px] font-semibold opacity-90">
            {message.replyTo.sender?.fullName ||
              message.replyTo.sender?.username ||
              "پیام"}
          </span>

          <span className="truncate text-[11px] opacity-75">
            {message.replyTo.content ||
              (message.replyTo.mediaUrls &&
              message.replyTo.mediaUrls.length > 0
                ? "📷 تصویر"
                : "پیام ارجاع‌شده")}
          </span>
        </button>
      )}

      {message.mediaUrls.length > 0 && (
        <div
          className={cn(
            "grid gap-1",
            message.mediaUrls.length > 1 && "grid-cols-2",
            message.content && "mb-2"
          )}
        >
          {message.mediaUrls.map((mediaUrl, index) => (
            <div
              key={`${mediaUrl}-${index}`}
              className="relative aspect-[4/3] w-[min(14rem,70vw)] overflow-hidden rounded-xl bg-muted"
            >
              <Image
                src={mediaUrl}
                alt={t("messageAttachmentAlt", {
                  number: index + 1,
                })}
                fill
                sizes="(max-width: 640px) 70vw, 224px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {message.content && (
        <p className="whitespace-pre-wrap break-words">
          {message.content}
        </p>
      )}
    </div>
  );
}
