"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { MouseEvent, PointerEvent } from "react";
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

const LONG_PRESS_DURATION = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10;

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
  const [openReactionPicker, setOpenReactionPicker] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [deleteScope, setDeleteScope] =
    useState<DeleteScope | null>(null);
  const [deleteError, setDeleteError] =
    useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);

  const messageRef = useRef<HTMLDivElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  const copyTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const longPressTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const pointerStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  function clearLongPress() {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    pointerStartRef.current = null;
  }

  function closeContextMenu() {
    setShowOptions(false);
    setOpenReactionPicker(false);
  }

  function openContextMenu() {
    if (selectionMode || isDeleting || isHidden) return;

    setShowOptions(true);
    setOpenReactionPicker(true);
  }

  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    // Prevent the browser's native context menu.
    event.preventDefault();

    if (selectionMode) return;

    openContextMenu();
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (selectionMode || isDeleting || isHidden) return;

    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
      return;
    }

    const target = event.target;

    // Do not trigger long press on interactive elements.
    if (
      target instanceof Element &&
      target.closest(
        "button, a, input, textarea, select, video, audio, [role='button'], [role='checkbox']"
      )
    ) {
      return;
    }

    clearLongPress();
    longPressTriggeredRef.current = false;

    pointerStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    longPressTimeoutRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openContextMenu();
      longPressTimeoutRef.current = null;
    }, LONG_PRESS_DURATION);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;

    if (!start || start.pointerId !== event.pointerId) return;

    const distance = Math.hypot(
      event.clientX - start.x,
      event.clientY - start.y
    );

    if (distance > LONG_PRESS_MOVE_THRESHOLD) {
      clearLongPress();
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (
      pointerStartRef.current &&
      pointerStartRef.current.pointerId === event.pointerId
    ) {
      clearLongPress();
    }
  }

  function handlePointerCancel() {
    clearLongPress();
  }

  useEffect(() => {
    if (!showOptions) return;

    function handleOutsidePointerDown(event: globalThis.PointerEvent) {
      if (!(event.target instanceof Node)) return;

      const clickedMessage =
        messageRef.current?.contains(event.target);

      const clickedOptions =
        optionsRef.current?.contains(event.target);

      if (!clickedMessage && !clickedOptions) {
        closeContextMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    }

    // Dismiss menu when scrolling the chat container or page
    function handleScroll() {
      closeContextMenu();
    }

    document.addEventListener(
      "pointerdown",
      handleOutsidePointerDown
    );
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsidePointerDown
      );
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, {
        capture: true,
      });
    };
  }, [showOptions]);

  const createdAt = new Date(message.createdAt);

  const formattedTime = Number.isNaN(createdAt.getTime())
    ? ""
    : format(createdAt, "HH:mm");

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
      closeContextMenu();

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

  function handleTriggerReply() {
    closeContextMenu();

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

  async function handleEmojiClick(emoji: string): Promise<void> {
    if (isReactionPending || !onToggleReaction) {
      throw new Error("Reaction is unavailable.");
    }

    setIsReactionPending(true);

    try {
      await onToggleReaction(message.id, emoji);
      closeContextMenu();
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      throw error;
    } finally {
      setIsReactionPending(false);
    }
  }

  function openDeleteConfirmation(scope: DeleteScope) {
    if (isDeleting || (scope === "everyone" && !isMine)) {
      return;
    }

    setDeleteError(null);
    closeContextMenu();
    setDeleteScope(scope);
  }

  function closeDeleteConfirmation() {
    if (!isDeleting) {
      setDeleteScope(null);
    }
  }

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
        ref={messageRef}
        id={`message-${message.id}`}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClickCapture={(event) => {
          if (longPressTriggeredRef.current) {
            event.preventDefault();
            event.stopPropagation();
            longPressTriggeredRef.current = false;
          }
        }}
        className={cn(
          "group relative mb-3 flex max-w-[82%] select-none flex-col sm:max-w-[70%] [-webkit-touch-callout:none]",
          isMine ? "ml-auto items-end" : "mr-auto items-start",
          showOptions && "z-40"
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
          <div className="relative flex max-w-full flex-col">
            <div className="relative max-w-full">
              {content}

              <MessageActions
                optionsRef={optionsRef}
                isMine={isMine}
                hasContent={Boolean(message.content)}
                isDeleting={isDeleting}
                isCopied={isCopied}
                showOptions={showOptions}
                onToggleOptions={() => {
                  setShowOptions((previous) => !previous);
                  setOpenReactionPicker(false);
                }}
                onShowReactionPicker={() => {
                  setShowOptions(true);
                  setOpenReactionPicker(true);
                }}
                onReply={handleTriggerReply}
                onCopy={handleCopy}
                onStartSelection={() => {
                  closeContextMenu();
                  onStartSelection(message.id);
                }}
                onOpenDelete={openDeleteConfirmation}
              />
            </div>

            <MessageReactions
              reactions={message.reactions}
              currentUserId={currentUserId}
              isMine={isMine}
              isReactionPending={isReactionPending}
              onEmojiClick={handleEmojiClick}
              openPicker={openReactionPicker}
            />
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
