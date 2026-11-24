
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";

import {
  deleteDirectMessage,
  deleteMessageForMe,
} from "@/lib/dm/actions";
import { cn } from "@/lib/utils";

import MessageContent from "./message-bubble/MessageContent";
import MessageActions from "./message-bubble/MessageActions";
import MessageReactions from "./message-bubble/MessageReactions";
import DeleteMessageDialog from "./message-bubble/DeleteMessageDialog";
import type {
  DeleteScope,
  MessageBubbleProps,
} from "./message-bubble/types";

export type { MessageBubbleProps } from "./message-bubble/types";

export default function MessageBubble({
  message,
  currentUserId,
  isMine,
  onDeleted,
  selectionMode,
  isSelected,
  onToggleSelected,
  onStartSelection,
  onToggleReaction,
  onReply,
  onScrollToMessage,
}: MessageBubbleProps) {
  const t = useTranslations("Settings.Messages");
  const router = useRouter();

  const [isDeleting, startDeleteTransition] = useTransition();
  const [isReactionPending, setIsReactionPending] = useState(false);

  const [showOptions, setShowOptions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [deleteScope, setDeleteScope] =
    useState<DeleteScope | null>(null);
  const [deleteError, setDeleteError] =
    useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);

  const optionsRef = useRef<HTMLDivElement | null>(null);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Cleanup copy timeout.
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Close message options when clicking outside or pressing Escape.
  useEffect(() => {
    if (!showOptions) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !optionsRef.current?.contains(event.target)
      ) {
        setShowOptions(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowOptions(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showOptions]);

  const createdAt = new Date(message.createdAt);

  const formattedTime = Number.isNaN(createdAt.getTime())
    ? ""
    : format(createdAt, "HH:mm");

  // Copy message content.
  async function handleCopy() {
    if (!message.content) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content);
      } else {
        const textarea = document.createElement("textarea");

        textarea.value = message.content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setIsCopied(true);
      setShowOptions(false);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  }

  // Reply to message.
  function handleTriggerReply() {
    setShowOptions(false);

    const senderName =
      message.sender?.fullName ||
      message.sender?.username ||
      (isMine ? "You" : "User");

    onReply?.({
      id: message.id,
      senderName,
      content: message.content,
      hasMedia: message.mediaUrls.length > 0,
    });
  }

  // Hairline UI reaction handler.
  // Errors are re-thrown so Hairline can roll back its optimistic update.
  async function handleEmojiClick(emoji: string): Promise<void> {
    if (isReactionPending || !onToggleReaction) {
      throw new Error("Reaction is unavailable.");
    }

    setIsReactionPending(true);

    try {
      await onToggleReaction(message.id, emoji);
      setShowOptions(false);
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      throw error;
    } finally {
      setIsReactionPending(false);
    }
  }

  // Open delete confirmation.
  function openDeleteConfirmation(scope: DeleteScope) {
    if (isDeleting || (scope === "everyone" && !isMine)) {
      return;
    }

    setDeleteError(null);
    setShowOptions(false);
    setDeleteScope(scope);
  }

  function closeDeleteConfirmation() {
    if (!isDeleting) {
      setDeleteScope(null);
    }
  }

  // Delete message.
  function confirmDelete() {
    if (!deleteScope || isDeleting) return;

    const scope = deleteScope;

    startDeleteTransition(async () => {
      try {
        if (scope === "everyone") {
          await deleteDirectMessage(message.id);
        } else {
          await deleteMessageForMe(message.id);
        }

        setDeleteScope(null);
        setIsHidden(true);

        onDeleted?.(message.id);
        router.refresh();
      } catch (error) {
        console.error("Failed to delete message:", error);
        setDeleteError(t("deleteMessageError"));
      }
    });
  }

  if (isHidden) return null;

  const content = (
    <MessageContent
      message={message}
      isMine={isMine}
      selectionMode={selectionMode}
      isSelected={isSelected}
      onScrollToMessage={onScrollToMessage}
    />
  );

  return (
    <>
      <div
        id={`message-${message.id}`}
        className={cn(
          "group relative mb-3 flex max-w-[82%] flex-col sm:max-w-[70%]",
          isMine ? "ml-auto items-end" : "mr-auto items-start"
        )}
      >
        {selectionMode ? (
          <div
            role="checkbox"
            tabIndex={0}
            aria-label={t("selectMessage")}
            aria-checked={isSelected}
            onClick={() => onToggleSelected(message.id)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggleSelected(message.id);
              }
            }}
            className="flex max-w-full cursor-pointer items-center gap-2 rounded-xl text-start"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/60 bg-background"
              )}
            >
              {isSelected && <Check className="h-3.5 w-3.5" />}
            </span>

            {content}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <MessageActions
              optionsRef={optionsRef}
              isMine={isMine}
              hasContent={Boolean(message.content)}
              isDeleting={isDeleting}
              isCopied={isCopied}
              showOptions={showOptions}
              onToggleOptions={() =>
                setShowOptions((previous) => !previous)
              }
              onShowReactionPicker={() => {
                // The reaction picker is now provided by Hairline UI.
                setShowOptions(false);
              }}
              onReply={handleTriggerReply}
              onCopy={handleCopy}
              onStartSelection={() => {
                setShowOptions(false);
                onStartSelection(message.id);
              }}
              onOpenDelete={openDeleteConfirmation}
            />

            <div className="flex flex-col gap-1">
              {content}

              <MessageReactions
                reactions={message.reactions}
                currentUserId={currentUserId}
                isMine={isMine}
                isReactionPending={isReactionPending}
                onEmojiClick={handleEmojiClick}
              />
            </div>
          </div>
        )}

        {deleteError && (
          <p
            role="alert"
            className="mt-1 text-xs text-destructive"
          >
            {deleteError}
          </p>
        )}

        {formattedTime && (
          <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
            <time dateTime={createdAt.toISOString()}>
              {formattedTime}
            </time>

            {isMine && (
              <span
                className="inline-flex items-center"
                title={message.isSeen ? t("seen") : t("sent")}
              >
                {message.isSeen ? (
                  <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {deleteScope && (
        <DeleteMessageDialog
          messageId={message.id}
          scope={deleteScope}
          isDeleting={isDeleting}
          onClose={closeDeleteConfirmation}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
