"use client";

import { Loader2 } from "lucide-react";

interface DeleteModalProps {
  open: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({
  open,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-conversation-title"
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
      >
        <h3
          id="delete-conversation-title"
          className="text-lg font-bold"
        >
          Delete conversation?
        </h3>

        <p className="text-sm leading-relaxed text-muted-foreground">
          This will delete the entire conversation history from your
          inbox. This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
          >
            {isDeleting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
