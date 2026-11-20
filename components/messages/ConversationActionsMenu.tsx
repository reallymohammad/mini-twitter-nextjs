"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Ban,
  Copy,
  Flag,
  Loader2,
  MoreHorizontal,
  Trash2,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";

type RelationshipStatus = {
  hasBlockedThem: boolean;
  isBlockedByThem: boolean;
  isMutedByMe: boolean;
};

interface Props {
  user: {
    id: string;
    username: string;
  } | null;
  locale: string;
  onDelete: () => void | Promise<void>;
  onReportUser?: (userId: string) => void;
  alwaysShowTrigger?: boolean;
}

export default function ConversationActionsMenu({
  user,
  locale,
  onDelete,
  onReportUser,
  alwaysShowTrigger = false,
}: Props) {
  const t = useTranslations("conversationList");
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RelationshipStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "block" | "mute" | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;
  const username = user?.username;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !userId) return;

    const controller = new AbortController();
    const query = new URLSearchParams({ targetUserId: userId });

    setLoadingStatus(true);
    setStatus(null);
    setError(null);

    async function loadStatus() {
      try {
        const [blockResponse, muteResponse] = await Promise.all([
          fetch(`/api/block?${query}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(`/api/mute?${query}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (!blockResponse.ok || !muteResponse.ok) {
          throw new Error("Could not load relationship status");
        }

        const [block, mute] = await Promise.all([
          blockResponse.json(),
          muteResponse.json(),
        ]);

        if (!controller.signal.aborted) {
          setStatus({
            hasBlockedThem: block.hasBlockedThem === true,
            isBlockedByThem: block.isBlockedByThem === true,
            isMutedByMe: mute.isMutedByMe === true,
          });
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          console.error("Could not load conversation actions:", cause);
          setError(t("statusError"));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingStatus(false);
        }
      }
    }

    void loadStatus();

    return () => controller.abort();
  }, [open, userId, t]);

  async function updateRelationship(kind: "block" | "mute") {
    if (!userId || !status || pendingAction || deleting) return;

    const currentlyEnabled =
      kind === "block" ? status.hasBlockedThem : status.isMutedByMe;

    setPendingAction(kind);
    setError(null);

    try {
      const response = await fetch(`/api/${kind}`, {
        method: currentlyEnabled ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (!response.ok) {
        throw new Error(`${kind} request failed: ${response.status}`);
      }

      setStatus((previous) =>
        previous
          ? {
              ...previous,
              ...(kind === "block"
                ? { hasBlockedThem: !currentlyEnabled }
                : { isMutedByMe: !currentlyEnabled }),
            }
          : previous,
      );

      router.refresh();
    } catch (cause) {
      console.error(`Could not update ${kind}:`, cause);
      setError(kind === "block" ? t("blockError") : t("muteError"));
    } finally {
      setPendingAction(null);
    }
  }

  async function copyProfileLink() {
    if (!username) return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${locale}/${encodeURIComponent(username)}`,
      );
      setOpen(false);
    } catch (cause) {
      console.error("Could not copy profile link:", cause);
      setError(t("copyError"));
    }
  }

  async function handleDelete() {
    if (deleting || pendingAction) return;

    setDeleting(true);
    setError(null);

    try {
      await onDelete();
      setOpen(false);
    } catch (cause) {
      console.error("Could not delete conversation:", cause);
      setError(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  const actionClass =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50";

  const conversationPath = `/${locale}/messages`;

  return (
    <div ref={rootRef} className="relative z-30 shrink-0">
      <button
        type="button"
        aria-label={t("moreActions")}
        title={t("moreActions")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary ${
          alwaysShowTrigger
            ? ""
            : "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        }`}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("moreActions")}
          className="absolute end-0 top-full z-50 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-background p-1.5 shadow-xl"
          onKeyDown={(event) => {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                '[role="menuitem"]:not([disabled])',
              ),
            );
            const index = items.indexOf(
              document.activeElement as HTMLElement,
            );

            if (
              event.key === "ArrowDown" ||
              event.key === "ArrowUp"
            ) {
              event.preventDefault();

              const direction =
                event.key === "ArrowDown" ? 1 : -1;
              const next =
                (index + direction + items.length) % items.length;

              items[next]?.focus();
            }
          }}
        >
          {user && (
            <>
              <Link
                role="menuitem"
                href={`/${locale}/${encodeURIComponent(
                  user.username,
                )}?from=${encodeURIComponent(conversationPath)}`}
                onClick={() => setOpen(false)}
                className={actionClass}
              >
                <UserRound size={16} />
                {t("viewProfile")}
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={() => void copyProfileLink()}
                className={actionClass}
              >
                <Copy size={16} />
                {t("copyProfileLink")}
              </button>

              {loadingStatus && (
                <div
                  role="status"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
                >
                  <Loader2 size={14} className="animate-spin" />
                  {t("loadingActions")}
                </div>
              )}

              {!loadingStatus && status && (
                <>
                  {!status.hasBlockedThem &&
                    !status.isBlockedByThem && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={pendingAction !== null || deleting}
                        onClick={() =>
                          void updateRelationship("mute")
                        }
                        className={actionClass}
                      >
                        {pendingAction === "mute" ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : status.isMutedByMe ? (
                          <Volume2 size={16} />
                        ) : (
                          <VolumeX size={16} />
                        )}
                        {status.isMutedByMe
                          ? t("unmuteUser")
                          : t("muteUser")}
                      </button>
                    )}

                  <button
                    type="button"
                    role="menuitem"
                    disabled={pendingAction !== null || deleting}
                    onClick={() =>
                      void updateRelationship("block")
                    }
                    className={actionClass}
                  >
                    {pendingAction === "block" ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Ban size={16} />
                    )}
                    {status.hasBlockedThem
                      ? t("unblockUser")
                      : t("blockUser")}
                  </button>

                  {status.isBlockedByThem && (
                    <p className="px-3 py-1 text-xs text-muted-foreground">
                      {t("blockedByUser")}
                    </p>
                  )}
                </>
              )}

              {onReportUser && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onReportUser(user.id);
                  }}
                  className={actionClass}
                >
                  <Flag size={16} />
                  {t("reportUser")}
                </button>
              )}

              <div className="my-1 border-t border-border" />
            </>
          )}

          <button
            type="button"
            role="menuitem"
            disabled={deleting || pendingAction !== null}
            onClick={() => void handleDelete()}
            className={`${actionClass} text-destructive`}
          >
            {deleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            {t("deleteConversation")}
          </button>

          {error && (
            <p
              role="alert"
              className="px-3 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
