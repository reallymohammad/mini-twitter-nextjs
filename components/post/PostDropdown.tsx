"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import {
  MoreHorizontal,
  Pin,
  Trash2,
  Link,
  Check,
  Volume2,
  VolumeX,
  UserX,
  UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

interface PostDropdownProps {
  postId: string;
  authorId: string;
  authorUsername?: string;
  currentUserId?: string;
  isPinned?: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
  redirectAfterDelete?: boolean;
  fallbackHref?: string;
}

export default function PostDropdown({
  postId,
  authorId,
  authorUsername,
  currentUserId,
  isPinned = false,
  isBlocked = false,
  isMuted = false,
  redirectAfterDelete = false,
  fallbackHref,
}: PostDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(isPinned);
  const [blocked, setBlocked] = useState(isBlocked);
  const [muted, setMuted] = useState(isMuted);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  const t = useTranslations("PostDropdown");
  const locale = useLocale();
  const router = useRouter();

  const isRtl = locale === "fa" || locale === "ar";
  const isOwner = currentUserId === authorId;
  const username = authorUsername ?? "user";

  useEffect(() => {
    setBlocked(isBlocked);
  }, [isBlocked]);

  useEffect(() => {
    setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    setPinned(isPinned);
  }, [isPinned]);

  const handleCopyLink = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    const postUrl = `${window.location.origin}/${locale}/status/${postId}`;

    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handlePin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isActionPending) return;

    setIsOpen(false);
    setIsActionPending(true);

    const nextPinned = !pinned;
    const method = pinned ? "DELETE" : "POST";

    try {
      const response = await fetch(`/api/posts/${postId}/pin`, { method });
      if (!response.ok) throw new Error("Pin request failed");

      setPinned(nextPinned);
      router.refresh();
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleMuteToggle = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (isActionPending) return;

    setIsOpen(false);
    setIsActionPending(true);

    const previousMuted = muted;
    setMuted(!previousMuted);

    try {
      const response = await fetch("/api/mute", {
        method: previousMuted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: authorId }),
      });

      if (!response.ok) throw new Error("Mute request failed");

      router.refresh();
    } catch (error) {
      setMuted(previousMuted);
      console.error("Failed to toggle mute:", error);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleBlockToggle = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (isActionPending) return;

    setIsOpen(false);
    setIsActionPending(true);

    const previousBlocked = blocked;
    const nextBlocked = !previousBlocked;
    setBlocked(nextBlocked);

    try {
      const response = await fetch("/api/block", {
        method: previousBlocked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: authorId }),
      });

      if (!response.ok) throw new Error("Block request failed");

      router.refresh();
    } catch (error) {
      setBlocked(previousBlocked);
      console.error("Failed to toggle block:", error);
    } finally {
      setIsActionPending(false);
    }
  };

  const openDeleteConfirm = (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setIsOpen(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete request failed");

      if (!redirectAfterDelete) {
        router.refresh();
        return;
      }

      const canGoBack =
        window.history.length > 1 &&
        document.referrer.startsWith(window.location.origin);

      if (canGoBack) {
        router.back();
      } else {
        router.push(fallbackHref ?? `/${locale}`);
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Post menu"
        aria-expanded={isOpen}
        disabled={isActionPending}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <MoreHorizontal size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(event) => event.stopPropagation()}
              className={`absolute top-8 z-20 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950 ${
                isRtl
                  ? "left-0 origin-top-left"
                  : "right-0 origin-top-right"
              }`}
            >
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-zinc-900"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-green-500" />
                    <span className="text-green-500">
                      {t("linkCopied")}
                    </span>
                  </>
                ) : (
                  <>
                    <Link size={16} />
                    <span>{t("copyLink")}</span>
                  </>
                )}
              </button>

              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={handlePin}
                    disabled={isActionPending}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-900"
                  >
                    <Pin
                      size={16}
                      className={pinned ? "fill-current" : ""}
                    />
                    <span>{pinned ? t("unpin") : t("pin")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openDeleteConfirm}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-zinc-900 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    <Trash2 size={16} />
                    <span>{t("delete")}</span>
                  </button>
                </>
              )}

              {!isOwner && currentUserId && (
                <>
                  {!blocked && (
                    <button
                      type="button"
                      onClick={handleMuteToggle}
                      disabled={isActionPending}
                      className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-900"
                    >
                      {muted ? (
                        <Volume2 size={16} />
                      ) : (
                        <VolumeX size={16} />
                      )}
                      <span>
                        {muted
                          ? t("unmute", { username })
                          : t("mute", { username })}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleBlockToggle}
                    disabled={isActionPending}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-zinc-900 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    {blocked ? (
                      <UserCheck size={16} />
                    ) : (
                      <UserX size={16} />
                    )}
                    <span>
                      {blocked
                        ? t("unblock", { username })
                        : t("block", { username })}
                    </span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showDeleteConfirm && (
        <AnimatePresence>
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={(event) => {
                event.stopPropagation();
                setShowDeleteConfirm(false);
              }}
            />

            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              onClick={(event) => event.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                dir={isRtl ? "rtl" : "ltr"}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-black"
              >
                <h2 className="mb-2 text-xl font-bold text-black dark:text-white">
                  {t("deleteConfirmTitle")}
                </h2>

                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                  {t("deleteConfirmDescription")}
                </p>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="mb-3 w-full rounded-full bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeleting
                    ? t("deleting")
                    : t("deleteConfirmAction")}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="w-full rounded-full border border-gray-300 py-3 text-sm font-bold text-black transition-colors hover:bg-gray-100 disabled:opacity-60 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900"
                >
                  {t("cancel")}
                </button>
              </motion.div>
            </div>
          </>
        </AnimatePresence>
      )}
    </div>
  );
}
