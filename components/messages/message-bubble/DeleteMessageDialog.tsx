"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

import type { DeleteScope } from "./types";

interface DeleteMessageDialogProps {
  messageId: string;
  scope: DeleteScope;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteMessageDialog({
  messageId,
  scope,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteMessageDialogProps) {
  const t = useTranslations("Settings.Messages");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`delete-message-title-${messageId}`}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label={t("cancel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <h2
            id={`delete-message-title-${messageId}`}
            className="text-base font-semibold text-foreground"
          >
            {t("deleteMessageTitle")}
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {scope === "everyone"
              ? t("deleteForEveryoneDescription")
              : t("deleteForMeDescription")}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {t("cancel")}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-destructive px-3.5 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("deleting")}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                {t("confirmDelete")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
