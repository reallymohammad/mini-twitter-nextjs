"use client";

import { useState } from "react";
import { MoreHorizontal, Pin, Trash2, Link, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

interface PostDropdownProps {
  postId: string;
  authorId: string;
  currentUserId?: string;
  isPinned?: boolean;
  redirectAfterDelete?: boolean;
  fallbackHref?: string;
}

export default function PostDropdown({
  postId,
  authorId,
  currentUserId,
  isPinned = false,
  redirectAfterDelete = false,
  fallbackHref,
}: PostDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(isPinned);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const t = useTranslations("PostDropdown");
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === "fa";
  const isOwner = currentUserId === authorId;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/${locale}/status/${postId}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    const method = pinned ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/posts/${postId}/pin`, { method });
      if (res.ok) {
        setPinned(!pinned);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) return;

      if (!redirectAfterDelete) {
        router.refresh();
        return;
      }

      const canGoBack =
        typeof window !== "undefined" &&
        window.history.length > 1 &&
        document.referrer.startsWith(window.location.origin);

      if (canGoBack) {
        router.back();
      } else {
        router.push(fallbackHref ?? `/${locale}`);
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="text-gray-500 hover:text-black dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <MoreHorizontal size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-8 w-44 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg z-20 overflow-hidden ${
                isRtl ? "left-0 origin-top-left" : "right-0 origin-top-right"
              }`}
            >
              <button
                onClick={handleCopyLink}
                className="flex w-full items-center gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 text-sm transition-colors text-gray-700 dark:text-gray-300"
              >
                {copied ? (
                  <><Check size={16} className="text-green-500" /><span className="text-green-500">{t("linkCopied")}</span></>
                ) : (
                  <><Link size={16} /><span>{t("copyLink")}</span></>
                )}
              </button>

              {isOwner && (
                <button
                  onClick={handlePin}
                  className="flex w-full items-center gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 text-sm transition-colors text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-zinc-900"
                >
                  <Pin size={16} className={pinned ? "fill-current" : ""} />
                  <span>{pinned ? t("unpin") : t("pin")}</span>
                </button>
              )}

              {isOwner && (
                <button
                  onClick={openDeleteConfirm}
                  className="flex w-full items-center gap-2 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-sm transition-colors border-t border-gray-100 dark:border-zinc-900"
                >
                  <Trash2 size={16} />
                  <span>{t("delete")}</span>
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal (Twitter-like) */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
            />
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                dir={isRtl ? "rtl" : "ltr"}
                className="bg-white dark:bg-black rounded-2xl w-full max-w-sm p-6 shadow-xl"
              >
                <h2 className="text-xl font-bold text-black dark:text-white mb-2">
                  {t("deleteConfirmTitle")}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  {t("deleteConfirmDescription")}
                </p>

                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="w-full py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-60 mb-3"
                >
                  {isDeleting ? t("deleting") : t("deleteConfirmAction")}
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="w-full py-3 rounded-full border border-gray-300 dark:border-zinc-700 text-black dark:text-white font-bold text-sm hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-60"
                >
                  {t("cancel")}
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
