"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import ChatHeader, {
  type ChatHeaderProps,
} from "./ChatHeader";
import MessageList from "./MessageList";
import DeleteModal from "./DeleteModal";
import {
  useChatRealtime,
  type InitialMessage,
} from "./useChatRealtime";
import MessageInput, { type ReplyTarget } from "../MessageInput";

import { deleteSelectedMessages } from "@/lib/dm/actions";
import type { DirectMessagePayload } from "@/lib/dm/types";

export type Recipient = ChatHeaderProps["recipient"];
export type { MessageItem } from "./useChatRealtime";

type DeleteScope = "me" | "everyone";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  recipient: Recipient;
  messages: InitialMessage[];
  locale?: string;
}

export default function ChatWindow(props: ChatWindowProps) {
  return (
    <ChatWindowContent
      key={props.conversationId}
      {...props}
    />
  );
}

function ChatWindowContent({
  conversationId,
  currentUserId,
  recipient,
  messages: initialMessages,
  locale = "fa",
}: ChatWindowProps) {
  const t = useTranslations("Settings.Messages");
  const router = useRouter();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showScrollBottomButton, setShowScrollBottomButton] =
    useState(false);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);

  const [deletedMessageIds, setDeletedMessageIds] =
    useState<Set<string>>(() => new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] =
    useState<Set<string>>(() => new Set());

  const [bulkDeleteScope, setBulkDeleteScope] =
    useState<DeleteScope | null>(null);
  const [bulkDeleteCount, setBulkDeleteCount] = useState(0);
  const [isDeletingSelected, setIsDeletingSelected] =
    useState(false);
  const [bulkDeleteError, setBulkDeleteError] =
    useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    setShowScrollBottomButton(distanceFromBottom > 250);
  }, []);

  const handleMessageDeleted = useCallback(
    (messageId: string) => {
      setDeletedMessageIds((previous) => {
        if (previous.has(messageId)) return previous;

        const next = new Set(previous);
        next.add(messageId);
        return next;
      });

      setSelectedMessageIds((previous) => {
        if (!previous.has(messageId)) return previous;

        const next = new Set(previous);
        next.delete(messageId);
        return next;
      });

      setReplyingTo((current) => (current?.id === messageId ? null : current));
    },
    []
  );

  const handleMessageReceived = useCallback(
    (message: DirectMessagePayload) => {
      const container = messagesContainerRef.current;

      const nearBottom =
        !container ||
        container.scrollHeight -
          container.scrollTop -
          container.clientHeight <
          250;

      if (nearBottom || message.senderId === currentUserId) {
        if (scrollTimerRef.current) {
          clearTimeout(scrollTimerRef.current);
        }

        scrollTimerRef.current = setTimeout(() => {
          scrollToBottom("smooth");
        }, 60);
      }
    },
    [currentUserId, scrollToBottom]
  );

  const {
    messages,
    isRecipientTyping,
    isRecipientOnline,
    blockStatus,
    retryBlockCheck,
    forceBlock,
    handleMessageSent,
    handleTypingChange,
    handleDeleteConversation,
    isDeletingConversation,
    handleToggleReaction,
  } = useChatRealtime({
    conversationId,
    currentUserId,
    recipientId: recipient.id,
    recipientInitiallyOnline: false,
    initialMessages,
    locale,
    onMessageReceived: handleMessageReceived,
  });

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) => !deletedMessageIds.has(message.id)
      ),
    [messages, deletedMessageIds]
  );

  useEffect(() => {
    const visibleIds = new Set(
      visibleMessages.map((message) => message.id)
    );

    setSelectedMessageIds((previous) => {
      const remaining = [...previous].filter((id) =>
        visibleIds.has(id)
      );

      return remaining.length === previous.size
        ? previous
        : new Set(remaining);
    });
  }, [visibleMessages]);

  const selectedMessages = visibleMessages.filter((message) =>
    selectedMessageIds.has(message.id)
  );

  const allVisibleSelected =
    visibleMessages.length > 0 &&
    visibleMessages.every((message) =>
      selectedMessageIds.has(message.id)
    );

  const canDeleteSelectedForEveryone =
    selectedMessages.length > 0 &&
    selectedMessages.every(
      (message) => message.senderId === currentUserId
    );

  useEffect(() => {
    scrollToBottom("auto");

    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [scrollToBottom]);

  const startSelection = useCallback(
    (messageId: string) => {
      if (isDeletingSelected) return;

      setBulkDeleteError(null);
      setSelectedMessageIds(new Set([messageId]));
      setSelectionMode(true);
    },
    [isDeletingSelected]
  );

  const toggleMessageSelected = useCallback(
    (messageId: string) => {
      if (isDeletingSelected) return;

      setBulkDeleteError(null);
      setSelectedMessageIds((previous) => {
        const next = new Set(previous);

        if (next.has(messageId)) {
          next.delete(messageId);
        } else {
          next.add(messageId);
        }

        return next;
      });
    },
    [isDeletingSelected]
  );

  function stopSelecting() {
    if (isDeletingSelected) return;

    setSelectionMode(false);
    setSelectedMessageIds(new Set());
    setBulkDeleteError(null);
    setBulkDeleteScope(null);
  }

  function toggleSelectAll() {
    if (isDeletingSelected) return;

    setBulkDeleteError(null);
    setSelectedMessageIds(
      allVisibleSelected
        ? new Set()
        : new Set(
            visibleMessages.map((message) => message.id)
          )
    );
  }

  const handleScrollToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-primary/10", "transition-colors", "duration-500");
      setTimeout(() => {
        element.classList.remove("bg-primary/10");
      }, 1200);
    }
  }, []);

  function openBulkDelete(scope: DeleteScope) {
    if (
      isDeletingSelected ||
      selectedMessages.length === 0 ||
      (scope === "everyone" &&
        !canDeleteSelectedForEveryone)
    ) {
      return;
    }

    setBulkDeleteError(null);
    setBulkDeleteCount(selectedMessages.length);
    setBulkDeleteScope(scope);
  }

  async function confirmBulkDelete() {
    if (!bulkDeleteScope || isDeletingSelected) return;

    const scope = bulkDeleteScope;
    const ids = selectedMessages.map((message) => message.id);

    if (
      ids.length === 0 ||
      (scope === "everyone" &&
        !canDeleteSelectedForEveryone)
    ) {
      setBulkDeleteScope(null);
      return;
    }

    setIsDeletingSelected(true);
    setBulkDeleteError(null);

    const deletedIds: string[] = [];
    const failedIds: string[] = [];

    try {
      for (let index = 0; index < ids.length; index += 20) {
        const batch = ids.slice(index, index + 20);

        try {
          const result = await deleteSelectedMessages(
            batch,
            scope
          );

          deletedIds.push(...result.deletedIds);
          failedIds.push(...result.failedIds);
        } catch (error) {
          console.error(
            "[DM] Bulk delete batch failed:",
            error
          );
          failedIds.push(...batch);
        }
      }

      if (deletedIds.length > 0) {
        setDeletedMessageIds((previous) => {
          const next = new Set(previous);

          for (const id of deletedIds) {
            next.add(id);
          }

          return next;
        });

        router.refresh();
      }

      setBulkDeleteScope(null);

      if (failedIds.length > 0) {
        setSelectedMessageIds(new Set(failedIds));
        setBulkDeleteError(
          t("bulkDeletePartialError", {
            count: failedIds.length,
          })
        );
      } else {
        setSelectedMessageIds(new Set());
        setSelectionMode(false);
      }
    } finally {
      setIsDeletingSelected(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background select-none md:select-auto">
      <ChatHeader
        recipient={recipient}
        locale={locale}
        isRecipientOnline={isRecipientOnline}
        isRecipientTyping={isRecipientTyping}
        onDeleteClick={() => setDeleteModalOpen(true)}
      />

      {selectionMode && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2">
          <span className="me-auto text-xs text-muted-foreground">
            {t("selectedMessagesCount", {
              count: selectedMessages.length,
            })}
          </span>

          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={
              visibleMessages.length === 0 ||
              isDeletingSelected
            }
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs transition hover:bg-muted disabled:opacity-50"
          >
            {allVisibleSelected
              ? t("clearSelection")
              : t("selectAllMessages")}
          </button>

          <button
            type="button"
            onClick={() => openBulkDelete("me")}
            disabled={
              selectedMessages.length === 0 ||
              isDeletingSelected
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs transition hover:bg-muted disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("deleteSelectedForMe")}
          </button>

          <button
            type="button"
            onClick={() => openBulkDelete("everyone")}
            disabled={
              !canDeleteSelectedForEveryone ||
              isDeletingSelected
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-2.5 py-1.5 text-xs text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("deleteSelectedForEveryone")}
          </button>

          <button
            type="button"
            onClick={stopSelecting}
            disabled={isDeletingSelected}
            aria-label={t("cancelSelection")}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {selectionMode &&
        selectedMessages.length > 0 &&
        !canDeleteSelectedForEveryone && (
          <p className="px-4 pt-2 text-xs text-muted-foreground">
            {t("bulkDeleteEveryoneRequiresOwn")}
          </p>
        )}

      {bulkDeleteError && (
        <p
          role="alert"
          className="px-4 pt-2 text-xs text-destructive"
        >
          {bulkDeleteError}
        </p>
      )}

      <MessageList
        messages={visibleMessages}
        currentUserId={currentUserId}
        isRecipientTyping={isRecipientTyping}
        containerRef={messagesContainerRef}
        endRef={messagesEndRef}
        onScroll={handleScroll}
        showScrollBottomButton={showScrollBottomButton}
        onScrollToBottom={() => scrollToBottom("smooth")}
        onMessageDeleted={handleMessageDeleted}
        selectionMode={selectionMode}
        selectedMessageIds={selectedMessageIds}
        onToggleMessageSelected={toggleMessageSelected}
        onStartSelection={startSelection}
        onToggleReaction={handleToggleReaction}
        onReply={(target) => setReplyingTo(target)}
        onScrollToMessage={handleScrollToMessage}
      />

      <div className="border-t border-border bg-background/95 p-3 backdrop-blur">
        {blockStatus === "blocked" ? (
          <p
            role="status"
            className="mx-auto max-w-4xl py-2 text-center text-sm text-muted-foreground"
          >
            {t("blockedNotice")}
          </p>
        ) : blockStatus === "checking" ? (
          <p
            role="status"
            className="mx-auto max-w-4xl py-2 text-center text-sm text-muted-foreground"
          >
            {t("checkingBlockStatus")}
          </p>
        ) : blockStatus === "error" ? (
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-3 py-2">
            <p
              role="alert"
              className="text-center text-sm text-destructive"
            >
              {t("blockCheckError")}
            </p>
            <button
              type="button"
              onClick={retryBlockCheck}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-muted"
            >
              {t("retry")}
            </button>
          </div>
        ) : (
          <MessageInput
            conversationId={conversationId}
            draft={draft}
            onDraftChange={setDraft}
            onTypingChange={handleTypingChange}
            onMessageSent={handleMessageSent}
            onBlockError={forceBlock}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        )}
      </div>

      <DeleteModal
        open={deleteModalOpen}
        isDeleting={isDeletingConversation}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConversation}
      />

      {bulkDeleteScope && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
          onMouseDown={() => {
            if (!isDeletingSelected) {
              setBulkDeleteScope(null);
            }
          }}
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
                disabled={isDeletingSelected}
                onClick={() => setBulkDeleteScope(null)}
                aria-label={t("cancel")}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2
              id="bulk-delete-title"
              className="mt-4 text-base font-semibold"
            >
              {t("bulkDeleteTitle", {
                count: bulkDeleteCount,
              })}
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {bulkDeleteScope === "everyone"
                ? t("bulkDeleteForEveryoneDescription")
                : t("bulkDeleteForMeDescription")}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingSelected}
                onClick={() => setBulkDeleteScope(null)}
                className="rounded-lg border border-border px-3.5 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                disabled={isDeletingSelected}
                onClick={() => void confirmBulkDelete()}
                className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-destructive px-3.5 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeletingSelected ? (
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
      )}
    </div>
  );
}
