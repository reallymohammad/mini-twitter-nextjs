"use client";

import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  CheckSquare,
  Copy,
  Loader2,
  Reply,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { DeleteScope } from "./types";

interface MessageActionsProps {
  optionsRef: RefObject<HTMLDivElement | null>;
  isMine: boolean;
  hasContent: boolean;
  isDeleting: boolean;
  isCopied: boolean;
  showOptions: boolean;

  // Kept for compatibility with MessageBubble.
  // The menu is now opened by right-click or long-press.
  onToggleOptions: () => void;

  onShowReactionPicker: () => void;
  onReply: () => void;
  onCopy: () => void;
  onStartSelection: () => void;
  onOpenDelete: (scope: DeleteScope) => void;
}

export default function MessageActions({
  optionsRef,
  isMine,
  hasContent,
  isDeleting,
  isCopied,
  showOptions,
  onShowReactionPicker,
  onReply,
  onCopy,
  onStartSelection,
  onOpenDelete,
}: MessageActionsProps) {
  const t = useTranslations("Settings.Messages");

  if (!showOptions) return null;

  return (
    <div
      ref={optionsRef}
      className={cn(
        "absolute top-full z-40 mt-1.5",
        isMine ? "end-0" : "start-0"
      )}
    >
      <div
        role="menu"
        aria-label={t("messageOptions")}
        className={cn(
          "min-w-44 overflow-hidden rounded-xl border border-border bg-background p-1 shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-150"
        )}
      >
        <button
          type="button"
          role="menuitem"
          onClick={onReply}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs transition hover:bg-muted"
        >
          <Reply className="h-4 w-4 -scale-x-100" />
          {t("reply")}
        </button>

        {hasContent && (
          <button
            type="button"
            role="menuitem"
            onClick={onCopy}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs transition hover:bg-muted"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}

            {t("copyText")}
          </button>
        )}

        <button
          type="button"
          role="menuitem"
          onClick={onStartSelection}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs transition hover:bg-muted"
        >
          <CheckSquare className="h-4 w-4" />
          {t("selectMessage")}
        </button>

        <div className="my-1 border-t border-border" />

        <button
          type="button"
          role="menuitem"
          disabled={isDeleting}
          onClick={() => onOpenDelete("me")}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs transition hover:bg-muted disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}

          {t("deleteForMe")}
        </button>

        {isMine && (
          <button
            type="button"
            role="menuitem"
            disabled={isDeleting}
            onClick={() => onOpenDelete("everyone")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {t("deleteForEveryone")}
          </button>
        )}
      </div>
    </div>
  );
}
