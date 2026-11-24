"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatDistanceToNowStrict } from "date-fns";
import { faIR } from "date-fns/locale";
import {
  BadgeCheck,
  CheckCheck,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { deleteConversation } from "@/lib/dm/actions";
import ConversationActionsMenu from "@/components/messages/ConversationActionsMenu";

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
  onReportUser?: (userId: string) => void;
}

type BadgeKey = "blue" | "gold" | "grey" | "developer";

const badgeConfig: Record<
  string,
  { className: string; key: BadgeKey }
> = {
  BLUE: {
    className: "text-blue-500",
    key: "blue",
  },
  GOLD: {
    className: "text-amber-400",
    key: "gold",
  },
  GREY: {
    className: "text-neutral-400",
    key: "grey",
  },
  DEVELOPER: {
    className: "text-emerald-500",
    key: "developer",
  },
};

export default function ConversationList({
  conversations = [],
  locale,
  onReportUser,
}: ConversationListProps) {
  const t = useTranslations("conversationList");
  const tBadges = useTranslations("badges");
  const intlLocale = useLocale();
  const currentLocale = locale ?? intlLocale;
  const router = useRouter();
  const params = useParams();

  const activeConversationId = params?.conversationId as
    | string
    | undefined;

  const cancelRef = useRef<HTMLButtonElement>(null);

  const [conversationToDelete, setConversationToDelete] = useState<
    string | null
  >(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const visibleConversations = conversations.filter(
    (item) => !hiddenIds.has(item.id),
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!conversationToDelete) return;

    cancelRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        setConversationToDelete(null);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () =>
      document.removeEventListener("keydown", handleEscape);
  }, [conversationToDelete, isDeleting]);

  async function handleDeleteConfirm() {
    if (!conversationToDelete || isDeleting) return;

    const id = conversationToDelete;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteConversation(id);

      // لینک گفت‌وگوی حذف‌شده فوراً از لیست برداشته می‌شود.
      setHiddenIds((previous) => {
        const next = new Set(previous);
        next.add(id);
        return next;
      });

      setConversationToDelete(null);

      if (activeConversationId === id) {
        router.replace(`/${currentLocale}/messages`);
      } else {
        router.refresh();
      }
    } catch (cause) {
      console.error("Failed to delete conversation:", cause);
      setDeleteError(t("deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }

  if (visibleConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <CheckCheck className="h-6 w-6 stroke-[1.75]" />
        </div>

        <h3 className="mt-4 text-base font-bold text-foreground">
          {t("emptyTitle")}
        </h3>

        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
          {t("emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/60">
        {visibleConversations.map((item) => {
          const isActive = activeConversationId === item.id;
          const user = item.user;

          const displayName =
            user?.name || user?.username || t("deletedAccount");

          const username = user?.username
            ? `@${user.username}`
            : "";

          const avatarInitial = displayName
            .charAt(0)
            .toUpperCase();

          const badge = user?.badge
            ? badgeConfig[user.badge]
            : undefined;

          const badgeDescription = badge
            ? tBadges(badge.key)
            : null;

          // سرور و اولین رندر مرورگر خروجی یکسان دارند.
          const messageTime =
            isClient && item.lastMessage?.createdAt
              ? formatDistanceToNowStrict(
                  new Date(item.lastMessage.createdAt),
                  {
                    locale:
                      currentLocale === "fa"
                        ? faIR
                        : undefined,
                  },
                )
              : "";

          const hasMedia =
            (item.lastMessage?.mediaUrls?.length ?? 0) > 0;

          const previewText = item.lastMessage?.content
            ? item.lastMessage.content
            : hasMedia
              ? t("imageSent")
              : t("newConversation");

          const href = `/${currentLocale}/messages/${item.id}`;

          const conversationLabel = t("openConversationWith", {
            name: displayName,
          });

          return (
            <div
              key={item.id}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40",
                isActive &&
                  "border-e-2 border-primary bg-muted/70 hover:bg-muted/70",
                item.hasUnread && "bg-primary/[0.04]",
              )}
            >
              <Link
                href={href}
                className="absolute inset-0 z-0 focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={
                  badgeDescription
                    ? `${conversationLabel} — ${badgeDescription}`
                    : conversationLabel
                }
              />

              <div className="pointer-events-none relative z-10 shrink-0">
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border/80">
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt={displayName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {avatarInitial}
                    </span>
                  )}
                </div>

                {item.hasUnread && (
                  <span className="absolute -top-0.5 -end-0.5 flex h-3.5 w-3.5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                  </span>
                )}
              </div>

              <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={cn(
                        "truncate text-sm font-semibold tracking-tight",
                        item.hasUnread
                          ? "font-bold text-foreground"
                          : "text-foreground/90",
                      )}
                    >
                      {displayName}
                    </span>

                    {badge && (
                      <BadgeCheck
                        className={cn(
                          "h-4 w-4 shrink-0",
                          badge.className,
                        )}
                        fill="none"
                        aria-hidden="true"
                      />
                    )}

                    {username && (
                      <span className="hidden truncate text-xs text-muted-foreground/80 sm:inline">
                        {username}
                      </span>
                    )}
                  </div>

                  {messageTime && (
                    <span
                      className={cn(
                        "shrink-0 text-[11px]",
                        item.hasUnread
                          ? "font-bold text-primary"
                          : "text-muted-foreground/75",
                      )}
                    >
                      {messageTime}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 text-[13px] leading-snug",
                      item.hasUnread
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground/85",
                    )}
                  >
                    {hasMedia && (
                      <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                    )}

                    <span className="truncate">
                      {previewText}
                    </span>
                  </p>

                  {item.hasUnread && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              </div>

              <ConversationActionsMenu
                user={user}
                locale={currentLocale}
                onDelete={() => {
                  setDeleteError(null);
                  setConversationToDelete(item.id);
                }}
                onReportUser={onReportUser}
              />
            </div>
          );
        })}
      </div>

      {conversationToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isDeleting
            ) {
              setConversationToDelete(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-conversation-title"
            aria-describedby="delete-conversation-description"
            className="w-full max-w-sm rounded-3xl border border-border bg-background p-6 shadow-2xl"
          >
            <h3
              id="delete-conversation-title"
              className="text-lg font-extrabold"
            >
              {t("deleteTitle")}
            </h3>

            <p
              id="delete-conversation-description"
              className="mt-2 text-xs leading-relaxed text-muted-foreground"
            >
              {t("deleteDescription")}
            </p>

            {deleteError && (
              <p
                role="alert"
                className="mt-3 text-sm text-destructive"
              >
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteConfirm()}
                className="flex h-11 w-full items-center justify-center rounded-full bg-destructive text-sm font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("delete")
                )}
              </button>

              <button
                ref={cancelRef}
                type="button"
                disabled={isDeleting}
                onClick={() => setConversationToDelete(null)}
                className="flex h-11 w-full items-center justify-center rounded-full border border-border text-sm font-bold hover:bg-muted disabled:opacity-50"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
