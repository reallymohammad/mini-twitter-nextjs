// components/messages/ConversationList.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { faIR } from "date-fns/locale";
import { Trash2, Loader2, Image as ImageIcon, CheckCheck, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteConversation } from "@/lib/dm/actions";

interface ConversationItem {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    image: string | null;
    badge?: string | null;
  } | null;
  lastMessage: {
    id: string;
    content: string | null;
    mediaUrls: string[];
    createdAt: Date | string;
    senderId: string;
  } | null;
  hasUnread: boolean;
  createdAt: Date | string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  locale?: string;
}

export default function ConversationList({
  conversations = [],
  locale,
}: ConversationListProps) {
  const router = useRouter();
  const params = useParams();
  const activeConversationId = params?.conversationId as string | undefined;

  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDeleteConfirm = () => {
    if (!conversationToDelete) return;

    startDeleteTransition(async () => {
      try {
        await deleteConversation(conversationToDelete);

        if (activeConversationId === conversationToDelete) {
          const targetUrl = locale ? `/${locale}/messages` : "/messages";
          router.push(targetUrl);
        }

        setConversationToDelete(null);
        router.refresh();
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    });
  };

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <CheckCheck className="h-6 w-6 stroke-[1.75]" />
        </div>
        <h3 className="mt-4 text-base font-bold text-foreground">پیامی در صندوق ورودی نیست</h3>
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
          مکالمات خود را از طریق دکمه پیام جدید یا پروفایل افراد آغاز کنید.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/60">
        {conversations.map((item) => {
          const isActive = activeConversationId === item.id;
          const user = item.user;
          const displayName = user?.name || user?.username || "حساب حذف‌شده";
          const username = user?.username ? `@${user.username}` : "";
          const avatarInitial = displayName.charAt(0).toUpperCase();

          const messageTime = item.lastMessage?.createdAt
            ? formatDistanceToNowStrict(new Date(item.lastMessage.createdAt), {
                addSuffix: false,
                locale: locale === "fa" ? faIR : undefined,
              })
            : "";

          const hasMedia = (item.lastMessage?.mediaUrls?.length ?? 0) > 0;
          const previewText = item.lastMessage?.content
            ? item.lastMessage.content
            : hasMedia
            ? "تصویر ارسال شد"
            : "گفتگوی جدید";

          const href = locale ? `/${locale}/messages/${item.id}` : `/messages/${item.id}`;

          return (
            <div
              key={item.id}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-3.5 transition-all duration-150 ease-out sm:px-4",
                "hover:bg-muted/40 cursor-pointer select-none",
                isActive && "bg-muted/70 hover:bg-muted/70 border-r-2 border-primary",
                item.hasUnread && "bg-primary/[0.04]"
              )}
            >
              {/* کلیک اصلی برای رفتن به چت */}
              <Link href={href} className="absolute inset-0 z-0" aria-label={`گفتگو با ${displayName}`} />

              {/* آواتار کاربر */}
              <div className="relative shrink-0 pointer-events-none z-10">
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full ring-1 ring-border/80 bg-muted">
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt={displayName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground/90">
                      {avatarInitial}
                    </span>
                  )}
                </div>
                {item.hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                  </span>
                )}
              </div>

              {/* جزئیات متن گفتگو */}
              <div className="min-w-0 flex-1 pointer-events-none z-10">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className={cn(
                      "truncate text-sm font-semibold tracking-tight",
                      item.hasUnread ? "text-foreground font-bold" : "text-foreground/90"
                    )}>
                      {displayName}
                    </span>
                    {user?.badge && user.badge !== "NONE" && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500 fill-sky-500/20" />
                    )}
                    {username && (
                      <span className="truncate text-xs text-muted-foreground/80 hidden sm:inline">
                        {username}
                      </span>
                    )}
                  </div>

                  {messageTime && (
                    <span className={cn(
                      "shrink-0 text-[11px]",
                      item.hasUnread ? "font-bold text-primary" : "text-muted-foreground/75"
                    )}>
                      {messageTime}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "flex items-center gap-1.5 truncate text-[13px] leading-snug",
                      item.hasUnread
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground/85"
                    )}
                  >
                    {hasMedia && (
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{previewText}</span>
                  </p>

                  {item.hasUnread && (
                    <span className="shrink-0 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>

              {/* اکشن سطل زباله (با StopPropagation برای عدم باز شدن چت) */}
              <div className="relative z-20 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConversationToDelete(item.id);
                  }}
                  title="حذف گفتگو"
                  aria-label="حذف گفتگو"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 transition-all duration-150",
                    "hover:bg-destructive/15 hover:text-destructive active:scale-95",
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-80"
                  )}
                >
                  <Trash2 className="h-4 w-4 stroke-[1.75]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* مودال تأیید حذف توییترگونه */}
      {conversationToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px] animate-in fade-in-0 duration-150"
          onClick={() => setConversationToDelete(null)}
        >
          <div
            className="w-full max-w-xs sm:max-w-sm rounded-3xl border border-border/80 bg-background/95 p-6 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-foreground">گفتگو حذف شود؟</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              این گفتگو از صندوق ورودی شما حذف می‌شود. این عمل غیرقابل بازگشت است، اما پیام‌ها برای مخاطب باقی خواهند ماند مگر آنکه وی نیز گفتگو را حذف کند.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-destructive text-sm font-bold text-destructive-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>حذف</span>
                )}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConversationToDelete(null)}
                className="flex h-11 w-full items-center justify-center rounded-full border border-border bg-transparent text-sm font-bold text-foreground transition-colors hover:bg-muted/70 active:scale-[0.98]"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
