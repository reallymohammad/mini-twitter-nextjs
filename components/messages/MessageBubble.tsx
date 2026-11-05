// components/messages/MessageBubble.tsx
"use client";

import { useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, Loader2, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteDirectMessage } from "@/lib/dm/actions";

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    content: string | null;
    mediaUrls: string[];
    createdAt: Date | string;
    isSeen?: boolean;
  };
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();

  const createdAt = new Date(message.createdAt);
  const formattedTime = Number.isNaN(createdAt.getTime()) ? "" : format(createdAt, "HH:mm");

  const handleDelete = () => {
    if (confirm("آیا از حذف این پیام اطمینان دارید؟")) {
      startDeleteTransition(async () => {
        try {
          await deleteDirectMessage(message.id);
          router.refresh();
        } catch (err) {
          console.error("Failed to delete message:", err);
        }
      });
    }
  };

  return (
    <div
      className={cn(
        "group relative mb-3 flex max-w-[82%] flex-col sm:max-w-[70%]",
        isMine ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div className="flex items-center gap-1.5">
        {/* دکمه سطل زباله برای پیام‌های ارسالی کاربر */}
        {isMine && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            aria-label="حذف پیام"
            className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded-full hover:bg-muted"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        <div
          className={cn(
            "overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            isMine
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm border border-border bg-muted text-foreground"
          )}
        >
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
                    alt={`Message attachment ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 70vw, 224px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
        </div>
      </div>

      {formattedTime && (
        <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
          <time dateTime={createdAt.toISOString()}>{formattedTime}</time>

          {/* وضعیت سین برای پیام‌های ارسالی */}
          {isMine && (
            <span
              className="inline-flex items-center"
              title={message.isSeen ? "خوانده شد" : "ارسال شد"}
            >
              {message.isSeen ? (
                <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
              ) : (
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
