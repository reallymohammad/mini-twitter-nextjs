"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MoreVertical,
  Trash2,
  Loader2,
  ChevronDown,
  Info,
} from "lucide-react";

import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import {
  markConversationAsRead,
  deleteConversation,
  getMessagesSince,
} from "@/lib/dm/actions";
import type {
  DirectMessagePayload,
  MessageCursor,
} from "@/lib/dm/types";
import { supabase } from "@/lib/supabase/client";

export interface Recipient {
  id: string;
  name: string | null;
  username: string;
  image?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

export interface MessageItem extends DirectMessagePayload {
  text?: string;
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  recipient: Recipient;
  messages: any[];
  locale?: string;
}

function comparePositions(
  a: { createdAt: string | Date; id: string },
  b: { createdAt: string | Date; id: string }
) {
  const timeDifference =
    new Date(a.createdAt).getTime() -
    new Date(b.createdAt).getTime();

  if (timeDifference !== 0) return timeDifference;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function initialCursor(messages: any[]): MessageCursor | null {
  const validMessages = (messages || []).filter(
    (msg) =>
      typeof msg?.id === "string" &&
      !Number.isNaN(new Date(msg.createdAt).getTime())
  );

  if (validMessages.length === 0) return null;

  const last = [...validMessages].sort(comparePositions).at(-1)!;

  return {
    createdAt: new Date(last.createdAt).toISOString(),
    id: last.id,
  };
}

// با تغییر گفتگو، state و صف Broadcast مربوط به گفتگوی قبلی باقی نمی‌ماند.
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
  const router = useRouter();

  const normalizeIncomingMessage = useCallback(
    (raw: DirectMessagePayload & { text?: string }): MessageItem => ({
      id: raw.id,
      senderId: raw.senderId,
      conversationId: raw.conversationId || conversationId,
      content: raw.content ?? raw.text ?? null,
      mediaUrls: Array.isArray(raw.mediaUrls) ? raw.mediaUrls : [],
      createdAt: raw.createdAt,
      readAt: raw.readAt ?? null,
      isSeen: raw.isSeen ?? Boolean(raw.readAt),
      deletedAt: raw.deletedAt ?? null,
    }),
    [conversationId]
  );

  const [messages, setMessages] = useState<MessageItem[]>(() =>
    (initialMessages || [])
      .filter((msg) => typeof msg?.id === "string" && !msg.deletedAt)
      .map(normalizeIncomingMessage)
      .sort(comparePositions)
  );

  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [isRecipientOnline, setIsRecipientOnline] = useState(
    Boolean(recipient.isOnline)
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeletingConversation, startDeleteConversationTransition] =
    useTransition();
  const [showScrollBottomButton, setShowScrollBottomButton] =
    useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const channelReadyRef = useRef(false);
  const mountedRef = useRef(true);
  const pendingBroadcastsRef = useRef<DirectMessagePayload[]>([]);

  // این cursor با دریافت Broadcast جلو نمی‌رود.
  const recoveryCursorRef = useRef<MessageCursor | null>(
    initialCursor(initialMessages)
  );
  const reconcilingRef = useRef(false);
  const reconcileAgainRef = useRef(false);

  const avatarSrc = recipient.image || recipient.avatarUrl || null;

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;

    setShowScrollBottomButton(
      scrollHeight - scrollTop - clientHeight > 250
    );
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  const appendOrUpdateMessage = useCallback(
    (incoming: DirectMessagePayload) => {
      if (
        !incoming ||
        typeof incoming.id !== "string" ||
        !incoming.id ||
        incoming.conversationId !== conversationId
      ) {
        return;
      }

      if (incoming.deletedAt) {
        setMessages((previous) =>
          previous.filter((message) => message.id !== incoming.id)
        );
        return;
      }

      const normalized = normalizeIncomingMessage(incoming);

      setMessages((previous) => {
        const index = previous.findIndex(
          (message) => message.id === normalized.id
        );

        if (index !== -1) {
          const updated = [...previous];
          const existing = updated[index];

          updated[index] = {
            ...existing,
            ...normalized,
            readAt: normalized.readAt ?? existing.readAt,
            isSeen: Boolean(existing.isSeen || normalized.isSeen),
          };

          return updated;
        }

        return [...previous, normalized].sort(comparePositions);
      });

      // پیام تازهٔ خود کاربر همیشه دیده شود؛ خواندن تاریخچهٔ قدیمی
      // در اثر رسیدن پیام دیگران بی‌دلیل قطع نشود.
      const container = messagesContainerRef.current;
      const nearBottom =
        !container ||
        container.scrollHeight -
          container.scrollTop -
          container.clientHeight <
          250;

      if (nearBottom || incoming.senderId === currentUserId) {
        window.setTimeout(() => scrollToBottom("smooth"), 60);
      }
    },
    [
      conversationId,
      currentUserId,
      normalizeIncomingMessage,
      scrollToBottom,
    ]
  );

  const enqueueBroadcast = useCallback(
    (message: DirectMessagePayload) => {
      if (
        !mountedRef.current ||
        message.conversationId !== conversationId
      ) {
        return;
      }

      if (
        pendingBroadcastsRef.current.some(
          (queued) => queued.id === message.id
        )
      ) {
        return;
      }

      pendingBroadcastsRef.current.push(message);

      if (pendingBroadcastsRef.current.length > 50) {
        pendingBroadcastsRef.current.shift();
        console.warn(
          "[DM Realtime] Pending broadcast queue reached its limit."
        );
      }
    },
    [conversationId]
  );

  const flushPendingBroadcasts = useCallback(async () => {
    const channel = channelRef.current;

    if (!mountedRef.current || !channelReadyRef.current || !channel) {
      return;
    }

    while (
      mountedRef.current &&
      channelReadyRef.current &&
      channelRef.current === channel &&
      pendingBroadcastsRef.current.length > 0
    ) {
      const next = pendingBroadcastsRef.current[0];

      try {
        const status = await channel.send({
          type: "broadcast",
          event: "new_message",
          payload: next,
        });

        if (status !== "ok") {
          console.error(
            "[DM Realtime] Queued broadcast was not acknowledged:",
            status,
            next.id
          );
          break;
        }

        if (!mountedRef.current || channelRef.current !== channel) {
          break;
        }

        pendingBroadcastsRef.current.shift();
      } catch (error) {
        console.error(
          "[DM Realtime] Queued broadcast failed:",
          error
        );
        break;
      }
    }
  }, []);

  const broadcastSafely = useCallback(
    async (message: DirectMessagePayload) => {
      if (
        !mountedRef.current ||
        message.conversationId !== conversationId
      ) {
        return;
      }

      const channel = channelRef.current;

      if (!channelReadyRef.current || !channel) {
        enqueueBroadcast(message);
        return;
      }

      try {
        const status = await channel.send({
          type: "broadcast",
          event: "new_message",
          payload: message,
        });

        if (status !== "ok") {
          console.error(
            "[DM Realtime] Broadcast was not acknowledged:",
            status,
            message.id
          );
          enqueueBroadcast(message);
        }
      } catch (error) {
        console.error("[DM Realtime] Broadcast failed:", error);
        enqueueBroadcast(message);
      }
    },
    [conversationId, enqueueBroadcast]
  );

  const handleMessageSent = useCallback(
    (message: DirectMessagePayload) => {
      if (message.conversationId !== conversationId) return;

      appendOrUpdateMessage(message);
      void broadcastSafely({
        ...message,
        createdAt: new Date(message.createdAt).toISOString(),
      });
    },
    [appendOrUpdateMessage, broadcastSafely, conversationId]
  );

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      const channel = channelRef.current;

      if (!channelReadyRef.current || !channel) return;

      void channel
        .send({
          type: "broadcast",
          event: "typing_status",
          payload: {
            conversationId,
            userId: currentUserId,
            isTyping,
          },
        })
        .catch((error) => {
          console.error("[DM Realtime] Typing broadcast failed:", error);
        });
    },
    [conversationId, currentUserId]
  );

  const handleMarkAsRead = useCallback(async () => {
    try {
      const result = await markConversationAsRead(conversationId);
      const channel = channelRef.current;

      if (channelReadyRef.current && channel) {
        const status = await channel.send({
          type: "broadcast",
          event: "read_notice",
          payload: {
            conversationId,
            readerId: currentUserId,
            readAt: result.lastReadAt.toISOString(),
          },
        });

        if (status !== "ok") {
          console.warn(
            "[DM Realtime] Read notice was not acknowledged:",
            status
          );
        }
      }
    } catch (error) {
      console.error("[DM Realtime] Failed to mark as read:", error);
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    void handleMarkAsRead();
  }, [handleMarkAsRead]);

  useEffect(() => {
    mountedRef.current = true;
    let disposed = false;

    const channel = supabase.channel(`dm:${conversationId}`, {
      config: {
        presence: { key: currentUserId },
        broadcast: { self: false, ack: true },
      },
    });

    channelRef.current = channel;
    channelReadyRef.current = false;

    const reconcile = async () => {
      if (reconcilingRef.current) {
        reconcileAgainRef.current = true;
        return;
      }

      reconcilingRef.current = true;

      try {
        do {
          reconcileAgainRef.current = false;
          let hasMore = true;

          while (hasMore && !disposed) {
            const page = await getMessagesSince(
              conversationId,
              recoveryCursorRef.current
            );

            if (disposed) return;

            for (const message of page.messages) {
              appendOrUpdateMessage(message);
            }

            // فقط پاسخ مرتب پایگاه‌داده cursor را جلو می‌برد.
            recoveryCursorRef.current =
              page.nextCursor ?? recoveryCursorRef.current;
            hasMore = page.hasMore;
          }
        } while (reconcileAgainRef.current && !disposed);
      } catch (error) {
        console.error("[DM Realtime] Message recovery failed:", error);
      } finally {
        reconcilingRef.current = false;
      }
    };

    const handleReconnectOpportunity = () => {
      if (document.visibilityState === "visible") {
        void reconcile();
        void flushPendingBroadcasts();
      }
    };

    const handleOnline = () => {
      void reconcile();
      void flushPendingBroadcasts();
    };

    channel.on("broadcast", { event: "new_message" }, ({ payload }) => {
      const message = payload as DirectMessagePayload | undefined;

      if (message?.conversationId !== conversationId) return;

      appendOrUpdateMessage(message);

      if (message.senderId !== currentUserId) {
        void handleMarkAsRead();
      }
    });

    channel.on("broadcast", { event: "read_notice" }, ({ payload }) => {
      const notice = payload as
        | {
            conversationId?: string;
            readerId?: string;
            readAt?: string;
          }
        | undefined;

      if (
        notice?.conversationId !== conversationId ||
        notice.readerId !== recipient.id ||
        !notice.readAt
      ) {
        return;
      }

      const readTime = new Date(notice.readAt).getTime();
      if (Number.isNaN(readTime)) return;

      setMessages((previous) =>
        previous.map((message) =>
          message.senderId === currentUserId &&
          new Date(message.createdAt).getTime() <= readTime
            ? {
                ...message,
                readAt: notice.readAt,
                isSeen: true,
              }
            : message
        )
      );
    });

    channel.on("broadcast", { event: "typing_status" }, ({ payload }) => {
      if (
        payload?.conversationId !== conversationId ||
        payload?.userId !== recipient.id
      ) {
        return;
      }

      setIsRecipientTyping(Boolean(payload.isTyping));

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (payload.isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsRecipientTyping(false);
        }, 3500);
      }
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setIsRecipientOnline(
          Object.keys(state).includes(recipient.id)
        );
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (key === recipient.id) setIsRecipientOnline(true);
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key === recipient.id) setIsRecipientOnline(false);
      });

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        ({ new: row }) => {
          const message = row as unknown as DirectMessagePayload;

          if (message?.conversationId !== conversationId) return;

          appendOrUpdateMessage(message);

          if (message.senderId !== currentUserId) {
            void handleMarkAsRead();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        ({ new: row }) => {
          const message = row as unknown as DirectMessagePayload;

          if (message?.conversationId === conversationId) {
            appendOrUpdateMessage(message);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "Message",
        },
        ({ old: row }) => {
          const deletedId = (row as { id?: string })?.id;

          if (deletedId) {
            setMessages((previous) =>
              previous.filter((message) => message.id !== deletedId)
            );
          }
        }
      );

    channel.subscribe((status, error) => {
      if (disposed) return;

      if (status === "SUBSCRIBED") {
        channelReadyRef.current = true;
        void channel
          .track({ online_at: new Date().toISOString() })
          .catch((trackError) => {
            console.error(
              "[DM Realtime] Presence tracking failed:",
              trackError
            );
          });

        void flushPendingBroadcasts();
        void reconcile();
        void handleMarkAsRead();
      } else {
        channelReadyRef.current = false;

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          console.error("[DM Realtime] Channel status:", status, error);
        }
      }
    });

    document.addEventListener(
      "visibilitychange",
      handleReconnectOpportunity
    );
    window.addEventListener("focus", handleReconnectOpportunity);
    window.addEventListener("online", handleOnline);

    return () => {
      disposed = true;
      mountedRef.current = false;
      channelReadyRef.current = false;
      pendingBroadcastsRef.current = [];

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      document.removeEventListener(
        "visibilitychange",
        handleReconnectOpportunity
      );
      window.removeEventListener("focus", handleReconnectOpportunity);
      window.removeEventListener("online", handleOnline);

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [
    conversationId,
    currentUserId,
    recipient.id,
    appendOrUpdateMessage,
    flushPendingBroadcasts,
    handleMarkAsRead,
  ]);

  const handleDeleteConversation = () => {
    startDeleteConversationTransition(async () => {
      try {
        await deleteConversation(conversationId);
        router.push(`/${locale}/messages`);
        router.refresh();
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      }
    });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; items: MessageItem[] }[] = [];

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt);
      const isToday =
        new Date().toDateString() === messageDate.toDateString();
      const isYesterday =
        new Date(Date.now() - 86400000).toDateString() ===
        messageDate.toDateString();

      let dateLabel = messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (isToday) dateLabel = "Today";
      else if (isYesterday) dateLabel = "Yesterday";

      const currentGroup = groups[groups.length - 1];

      if (currentGroup?.dateLabel === dateLabel) {
        currentGroup.items.push(message);
      } else {
        groups.push({ dateLabel, items: [message] });
      }
    });

    return groups;
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden select-none md:select-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/messages`}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Back to messages"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <Link
            href={`/${locale}/${recipient.username}`}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted border border-border">
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt={recipient.name || recipient.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">
                    {(recipient.name || recipient.username)[0]?.toUpperCase() ||
                      "?"}
                  </div>
                )}
              </div>
              {isRecipientOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
              )}
            </div>

            <div className="flex flex-col">
              <span className="font-semibold text-sm group-hover:underline leading-tight">
                {recipient.name || recipient.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {isRecipientTyping ? (
                  <span className="text-primary font-medium animate-pulse">
                    typing...
                  </span>
                ) : isRecipientOnline ? (
                  "Online"
                ) : (
                  `@${recipient.username}`
                )}
              </span>
            </div>
          </Link>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((previous) => !previous)}
            className="p-2 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
            aria-label="Conversation options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-popover text-popover-foreground border border-border rounded-2xl shadow-xl py-1.5 z-50">
              <Link
                href={`/${locale}/${recipient.username}`}
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition"
              >
                <Info className="w-4 h-4 text-muted-foreground" />
                <span>View profile</span>
              </Link>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete conversation</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-6"
      >
        {groupedMessages.map((group) => (
          <div key={group.dateLabel} className="space-y-3">
            <div className="flex justify-center my-2">
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/40">
                {group.dateLabel}
              </span>
            </div>

            {group.items.map((message) => (
              <MessageBubble
                key={message.id}
                isMine={message.senderId === currentUserId}
                message={{
                  id: message.id,
                  senderId: message.senderId,
                  content: message.content,
                  mediaUrls: message.mediaUrls,
                  createdAt: message.createdAt,
                  isSeen: message.isSeen,
                }}
              />
            ))}
          </div>
        ))}

        {isRecipientTyping && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic px-2 py-1">
            <div className="flex space-x-1 items-center bg-muted/60 px-3 py-2 rounded-2xl border border-border/40">
              <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showScrollBottomButton && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-20 right-5 z-20 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Message Input Area */}
      <div className="p-3 border-t border-border bg-background/95 backdrop-blur">
        <MessageInput
          conversationId={conversationId}
          onTypingChange={handleTypingChange}
          onMessageSent={handleMessageSent}
        />
      </div>

      {/* Delete Conversation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Delete conversation?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will delete the entire conversation history from your
              inbox. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                disabled={isDeletingConversation}
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingConversation}
                onClick={handleDeleteConversation}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingConversation && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
