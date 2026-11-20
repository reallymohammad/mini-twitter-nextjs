"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import ChatHeader, { type ChatHeaderProps } from "./ChatHeader";
import MessageList from "./MessageList";
import DeleteModal from "./DeleteModal";
import {
  useChatRealtime,
  type InitialMessage,
} from "./useChatRealtime";
import MessageInput from "../MessageInput";

import type { DirectMessagePayload } from "@/lib/dm/types";

export type Recipient = ChatHeaderProps["recipient"];
export type { MessageItem } from "./useChatRealtime";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  recipient: Recipient;
  messages: InitialMessage[];
  locale?: string;
}

// با تغییر گفتگو، state گفتگوی قبلی باقی نمی‌ماند.
export default function ChatWindow(props: ChatWindowProps) {
  return <ChatWindowContent key={props.conversationId} {...props} />;
}

function ChatWindowContent({
  conversationId,
  currentUserId,
  recipient,
  messages: initialMessages,
  locale = "fa",
}: ChatWindowProps) {
  const t = useTranslations("Settings.Messages");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const [draft, setDraft] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  } = useChatRealtime({
    conversationId,
    currentUserId,
    recipientId: recipient.id,
    // page.tsx وضعیت آنلاین اولیه را در recipient ارسال نمی‌کند.
    // هوک می‌تواند وضعیت بعدی را از Presence به‌روزرسانی کند.
    recipientInitiallyOnline: false,
    initialMessages,
    locale,
    onMessageReceived: handleMessageReceived,
  });

  useEffect(() => {
    scrollToBottom("auto");

    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [scrollToBottom]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background select-none md:select-auto">
      <ChatHeader
        recipient={recipient}
        locale={locale}
        isRecipientOnline={isRecipientOnline}
        isRecipientTyping={isRecipientTyping}
        onDeleteClick={() => setDeleteModalOpen(true)}
      />

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isRecipientTyping={isRecipientTyping}
        containerRef={messagesContainerRef}
        endRef={messagesEndRef}
        onScroll={handleScroll}
        showScrollBottomButton={showScrollBottomButton}
        onScrollToBottom={() => scrollToBottom("smooth")}
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
            <p role="alert" className="text-center text-sm text-destructive">
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
          />
        )}
      </div>

      <DeleteModal
        open={deleteModalOpen}
        isDeleting={isDeletingConversation}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConversation}
      />
    </div>
  );
}
