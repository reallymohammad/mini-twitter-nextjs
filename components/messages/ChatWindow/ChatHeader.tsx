"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import ConversationActionsMenu from "@/components/messages/ConversationActionsMenu";

export interface ChatHeaderProps {
  recipient: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  };
  locale: string;
  isRecipientOnline: boolean;
  isRecipientTyping: boolean;
  onDeleteClick: () => void | Promise<void>;
  onReport?: () => void;
}

export default function ChatHeader({
  recipient,
  locale,
  isRecipientOnline,
  isRecipientTyping,
  onDeleteClick,
  onReport,
}: ChatHeaderProps) {
  const t = useTranslations("chatHeader");

  const status = isRecipientTyping
    ? t("typing")
    : isRecipientOnline
      ? t("online")
      : t("offline");

  return (
    <header className="z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={`/${locale}/messages`}
          aria-label={t("back")}
          className="rounded-full p-2 hover:bg-muted md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          {recipient.image ? (
            <Image
              src={recipient.image}
              alt={recipient.name}
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground">
              {recipient.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold leading-tight">
            {recipient.name}
          </h2>
          <span className="block truncate text-xs text-muted-foreground">
            @{recipient.username} · {status}
          </span>
        </div>
      </div>

      <ConversationActionsMenu
        user={{
          id: recipient.id,
          username: recipient.username,
        }}
        locale={locale}
        onDelete={onDeleteClick}
        onReportUser={onReport ? () => onReport() : undefined}
        alwaysShowTrigger
      />
    </header>
  );
}
