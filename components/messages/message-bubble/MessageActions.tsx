"use client";

import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  CheckSquare,
  Copy,
  Loader2,
  MoreHorizontal,
  Reply,
  SmilePlus,
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
  onToggleOptions,
  onShowReactionPicker,
  onReply,
  onCopy,
  onStartSelection,
  onOpenDelete,
}: MessageActionsProps) {
  const t = useTranslations("Settings.Messages");

  return (
    <div ref={optionsRef} className="relative">
      <button
        type="button"
        disabled={isDeleting}
        onClick={onToggleOptions}
        aria-label={t("messageOptions")}
        aria-haspopup="menu"
        aria-expanded={showOptions}
        className="rounded-full p-1 text-muted-foreground opacity-100 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isCopied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </button>

      {showOptions && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-30 mt-1 min-w-44 overflow-hidden rounded-xl border border-border bg-background p-1 shadow-lg",
            isMine ? "end-0" : "start-0"
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={onShowReactionPicker}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs transition hover:bg-muted"
          >
            <SmilePlus className="h-4 w-4" />
            {t("react")}
          </button>

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
              <Copy className="h-4 w-4" />
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

          <button
            type="button"
            role="menuitem"
            disabled={isDeleting}
            onClick={() => onOpenDelete("me")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs transition hover:bg-muted disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
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
      )}
    </div>
  );
}
