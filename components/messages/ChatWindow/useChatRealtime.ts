"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  markConversationAsRead,
  deleteConversation,
  getMessagesSince,
  getConversationBlockStatus,
  toggleMessageReaction,
} from "@/lib/dm/actions";
import type {
  DirectMessagePayload,
  MessageCursor,
  DirectMessageReactionPayload,
} from "@/lib/dm/types";
import { supabase } from "@/lib/supabase/client";

export interface MessageItem extends DirectMessagePayload {
  text?: string;
  reactions?: DirectMessageReactionPayload[];
}

export type InitialMessage = Omit<
  Partial<DirectMessagePayload>,
  "createdAt"
> & {
  id: string;
  senderId: string;
  createdAt: string | Date;
  text?: string | null;
  reactions?: DirectMessageReactionPayload[];
};

export type BlockStatus =
  | "checking"
  | "blocked"
  | "allowed"
  | "error";

interface UseChatRealtimeOptions {
  conversationId: string;
  currentUserId: string;
  recipientId: string;
  recipientInitiallyOnline?: boolean;
  initialMessages: InitialMessage[];
  locale: string;
  onMessageReceived: (message: DirectMessagePayload) => void;
}

function comparePositions(
  a: { createdAt: string | Date; id: string },
  b: { createdAt: string | Date; id: string }
) {
  const difference =
    new Date(a.createdAt).getTime() -
    new Date(b.createdAt).getTime();

  if (difference !== 0) return difference;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function getInitialCursor(
  messages: InitialMessage[]
): MessageCursor | null {
  const validMessages = messages.filter(
    (message) =>
      typeof message?.id === "string" &&
      !Number.isNaN(new Date(message.createdAt).getTime())
  );

  if (validMessages.length === 0) return null;

  const last = [...validMessages].sort(comparePositions).at(-1)!;

  return {
    createdAt: new Date(last.createdAt).toISOString(),
    id: last.id,
  };
}

function normalizeMessage(
  raw: InitialMessage | DirectMessagePayload,
  conversationId: string
): MessageItem {
  const text =
    "text" in raw ? raw.text ?? undefined : undefined;

  return {
    ...raw,
    text,
    id: raw.id,
    senderId: raw.senderId,
    conversationId: raw.conversationId || conversationId,
    content: raw.content ?? text ?? null,
    mediaUrls: Array.isArray(raw.mediaUrls)
      ? raw.mediaUrls
      : [],
    createdAt: new Date(raw.createdAt).toISOString(),
    readAt: raw.readAt ?? null,
    isSeen: raw.isSeen ?? Boolean(raw.readAt),
    deletedAt: raw.deletedAt ?? null,
    replyToId: raw.replyToId ?? null,
    replyTo: raw.replyTo ?? null,
    reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
  };
}

export function useChatRealtime({
  conversationId,
  currentUserId,
  recipientId,
  recipientInitiallyOnline,
  initialMessages,
  locale,
  onMessageReceived,
}: UseChatRealtimeOptions) {
  const router = useRouter();

  const [messages, setMessages] = useState<MessageItem[]>(() =>
    initialMessages
      .filter(
        (message) =>
          typeof message?.id === "string" &&
          typeof message?.senderId === "string" &&
          !message.deletedAt &&
          !Number.isNaN(
            new Date(message.createdAt).getTime()
          )
      )
      .map((message) =>
        normalizeMessage(message, conversationId)
      )
      .sort(comparePositions)
  );

  const [isRecipientTyping, setIsRecipientTyping] =
    useState(false);
  const [isRecipientOnline, setIsRecipientOnline] = useState(
    Boolean(recipientInitiallyOnline)
  );
  const [blockStatus, setBlockStatus] =
    useState<BlockStatus>("checking");
  const [blockCheckVersion, setBlockCheckVersion] = useState(0);

  const [
    isDeletingConversation,
    startDeleteConversationTransition,
  ] = useTransition();

  const typingTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const channelRef = useRef<
    ReturnType<typeof supabase.channel> | null
  >(null);
  const flushingChannelRef = useRef<
    ReturnType<typeof supabase.channel> | null
  >(null);

  const channelReadyRef = useRef(false);
  const mountedRef = useRef(false);
  const pendingBroadcastsRef =
    useRef<DirectMessagePayload[]>([]);

  const deletedMessageIdsRef = useRef<Set<string>>(
    new Set()
  );

  const blockCheckRequestRef = useRef(0);
  const recoveryCursorRef = useRef<MessageCursor | null>(
    getInitialCursor(initialMessages)
  );

  const retryBlockCheck = useCallback(() => {
    setBlockCheckVersion((version) => version + 1);
  }, []);

  const forceBlock = useCallback(() => {
    blockCheckRequestRef.current += 1;
    setBlockStatus("blocked");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++blockCheckRequestRef.current;

    setBlockStatus("checking");

    void getConversationBlockStatus(conversationId)
      .then(({ blocked }) => {
        if (
          !cancelled &&
          requestId === blockCheckRequestRef.current
        ) {
          setBlockStatus(
            blocked ? "blocked" : "allowed"
          );
        }
      })
      .catch((error) => {
        console.error(
          "[DM] Could not check block status:",
          error
        );

        if (
          !cancelled &&
          requestId === blockCheckRequestRef.current
        ) {
          setBlockStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, blockCheckVersion]);

  const removeDeletedMessage = useCallback(
    (messageId: string) => {
      if (!messageId) return;

      deletedMessageIdsRef.current.add(messageId);

      setMessages((previous) =>
        previous.filter(
          (message) => message.id !== messageId
        )
      );
    },
    []
  );

  const applyReactionUpdate = useCallback(
    (input: {
      messageId: string;
      userId: string;
      emoji: string | null;
    }) => {
      setMessages((previous) =>
        previous.map((message) => {
          if (message.id !== input.messageId) {
            return message;
          }

          const reactions = (message.reactions ?? []).filter(
            (reaction) => reaction.userId !== input.userId
          );

          if (input.emoji) {
            reactions.push({
              userId: input.userId,
              emoji: input.emoji,
            });
          }

          return {
            ...message,
            reactions,
          };
        })
      );
    },
    []
  );

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const result = await toggleMessageReaction(
        messageId,
        emoji
      );

      applyReactionUpdate(result);

      return result;
    },
    [applyReactionUpdate]
  );

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
        removeDeletedMessage(incoming.id);
        return;
      }

      if (deletedMessageIdsRef.current.has(incoming.id)) {
        return;
      }

      const normalized = normalizeMessage(
        incoming,
        conversationId
      );

      setMessages((previous) => {
        if (
          deletedMessageIdsRef.current.has(normalized.id)
        ) {
          return previous;
        }

        const index = previous.findIndex(
          (message) => message.id === normalized.id
        );

        if (index !== -1) {
          const updated = [...previous];
          const existing = updated[index];

          updated[index] = {
            ...existing,
            ...normalized,
            readAt:
              normalized.readAt ?? existing.readAt,
            isSeen: Boolean(
              existing.isSeen || normalized.isSeen
            ),
            replyToId:
              incoming.replyToId === undefined
                ? existing.replyToId
                : normalized.replyToId,
            replyTo:
              incoming.replyTo === undefined &&
              (incoming.replyToId === undefined ||
                incoming.replyToId ===
                  existing.replyToId)
                ? existing.replyTo
                : normalized.replyTo,
            reactions:
              incoming.reactions === undefined
                ? existing.reactions
                : normalized.reactions,
          };

          return updated;
        }

        return [...previous, normalized].sort(
          comparePositions
        );
      });

      onMessageReceived(incoming);
    },
    [
      conversationId,
      onMessageReceived,
      removeDeletedMessage,
    ]
  );

  const enqueueBroadcast = useCallback(
    (message: DirectMessagePayload) => {
      if (
        !mountedRef.current ||
        message.conversationId !== conversationId ||
        deletedMessageIdsRef.current.has(message.id)
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

  const flushPendingBroadcasts =
    useCallback(async () => {
      const channel = channelRef.current;

      if (
        !mountedRef.current ||
        !channelReadyRef.current ||
        !channel ||
        flushingChannelRef.current === channel
      ) {
        return;
      }

      flushingChannelRef.current = channel;

      try {
        while (
          mountedRef.current &&
          channelReadyRef.current &&
          channelRef.current === channel &&
          pendingBroadcastsRef.current.length > 0
        ) {
          const next =
            pendingBroadcastsRef.current[0];

          if (
            deletedMessageIdsRef.current.has(next.id)
          ) {
            pendingBroadcastsRef.current.shift();
            continue;
          }

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

            if (
              !mountedRef.current ||
              channelRef.current !== channel
            ) {
              break;
            }

            if (
              pendingBroadcastsRef.current[0] === next
            ) {
              pendingBroadcastsRef.current.shift();
            }
          } catch (error) {
            console.error(
              "[DM Realtime] Queued broadcast failed:",
              error
            );
            break;
          }
        }
      } finally {
        if (
          flushingChannelRef.current === channel
        ) {
          flushingChannelRef.current = null;
        }
      }
    }, []);

  const broadcastSafely = useCallback(
    async (message: DirectMessagePayload) => {
      if (
        !mountedRef.current ||
        message.conversationId !== conversationId ||
        deletedMessageIdsRef.current.has(message.id)
      ) {
        return;
      }

      const channel = channelRef.current;

      if (
        !channelReadyRef.current ||
        !channel ||
        pendingBroadcastsRef.current.length > 0 ||
        flushingChannelRef.current === channel
      ) {
        enqueueBroadcast(message);
        void flushPendingBroadcasts();
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
        console.error(
          "[DM Realtime] Broadcast failed:",
          error
        );
        enqueueBroadcast(message);
      }
    },
    [
      conversationId,
      enqueueBroadcast,
      flushPendingBroadcasts,
    ]
  );

  const handleMessageSent = useCallback(
    (message: DirectMessagePayload) => {
      if (
        message.conversationId !== conversationId
      ) {
        return;
      }

      appendOrUpdateMessage(message);

      void broadcastSafely({
        ...message,
        createdAt: new Date(
          message.createdAt
        ).toISOString(),
      });
    },
    [
      appendOrUpdateMessage,
      broadcastSafely,
      conversationId,
    ]
  );

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      if (blockStatus !== "allowed") return;

      const channel = channelRef.current;
      if (!channelReadyRef.current || !channel) {
        return;
      }

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
          console.error(
            "[DM Realtime] Typing broadcast failed:",
            error
          );
        });
    },
    [blockStatus, conversationId, currentUserId]
  );

  const handleMarkAsRead = useCallback(
    async () => {
      try {
        const result = await markConversationAsRead(
          conversationId,
          currentUserId
        );

        // اگر کاربر رسید را خاموش کرده باشد (result === null)، نوتیس ارسال نمی‌شود
        if (!result || !result.lastReadAt) {
          return;
        }

        const channel = channelRef.current;

        if (channelReadyRef.current && channel) {
          const status = await channel.send({
            type: "broadcast",
            event: "read_notice",
            payload: {
              conversationId,
              readerId: currentUserId,
              readAt: new Date(result.lastReadAt).toISOString(),
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
        console.error(
          "[DM Realtime] Failed to mark as read:",
          error
        );
      }
    },
    [conversationId, currentUserId]
  );



  useEffect(() => {
    void handleMarkAsRead();
  }, [handleMarkAsRead]);

  useEffect(() => {
    mountedRef.current = true;

    let disposed = false;
    let reconciling = false;
    let reconcileAgain = false;

    const channel = supabase.channel(
      `dm:${conversationId}`,
      {
        config: {
          private: false,
          presence: { key: currentUserId },
          broadcast: { self: false, ack: true },
        },
      }
    );

    channelRef.current = channel;
    channelReadyRef.current = false;

    const reconcile = async () => {
      if (reconciling) {
        reconcileAgain = true;
        return;
      }

      reconciling = true;

      try {
        do {
          reconcileAgain = false;
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

            recoveryCursorRef.current =
              page.nextCursor ??
              recoveryCursorRef.current;

            hasMore = page.hasMore;

            if (hasMore && !page.nextCursor) {
              console.error(
                "[DM Realtime] Recovery page hasMore=true without nextCursor."
              );
              break;
            }
          }
        } while (reconcileAgain && !disposed);
      } catch (error) {
        console.error(
          "[DM Realtime] Message recovery failed:",
          error
        );
      } finally {
        reconciling = false;
      }
    };

    const handleReconnectOpportunity = () => {
      if (
        document.visibilityState === "visible"
      ) {
        void reconcile();
        void flushPendingBroadcasts();
      }
    };

    const handleOnline = () => {
      void reconcile();
      void flushPendingBroadcasts();
    };

    channel.on(
      "broadcast",
      { event: "new_message" },
      ({ payload }) => {
        if (disposed) return;

        const message = payload as
          | DirectMessagePayload
          | undefined;

        if (
          message?.conversationId !==
          conversationId
        ) {
          return;
        }

        appendOrUpdateMessage(message);

        if (
          message.senderId !== currentUserId
        ) {
          void handleMarkAsRead();
        }
      }
    );

    channel.on(
      "broadcast",
      { event: "message_reaction_updated" },
      ({ payload }) => {
        if (disposed) return;

        const reaction = payload as
          | {
              conversationId?: string;
              messageId?: string;
              userId?: string;
              emoji?: string | null;
            }
          | undefined;

        if (
          reaction?.conversationId !== conversationId ||
          typeof reaction.messageId !== "string" ||
          typeof reaction.userId !== "string"
        ) {
          return;
        }

        applyReactionUpdate({
          messageId: reaction.messageId,
          userId: reaction.userId,
          emoji:
            typeof reaction.emoji === "string"
              ? reaction.emoji
              : null,
        });
      }
    );

    channel.on(
      "broadcast",
      { event: "message_deleted" },
      ({ payload }) => {
        if (disposed) return;

        const deletion = payload as
          | {
              conversationId?: string;
              messageId?: string;
            }
          | undefined;

        if (
          deletion?.conversationId !==
            conversationId ||
          typeof deletion.messageId !==
            "string" ||
          !deletion.messageId
        ) {
          return;
        }

        removeDeletedMessage(
          deletion.messageId
        );
      }
    );

    channel.on(
      "broadcast",
      { event: "read_notice" },
      ({ payload }) => {
        if (disposed) return;

        const notice = payload as
          | {
              conversationId?: string;
              readerId?: string;
              readAt?: string;
            }
          | undefined;

        if (
          notice?.conversationId !==
            conversationId ||
          notice.readerId !== recipientId ||
          !notice.readAt
        ) {
          return;
        }

        const readTime = new Date(
          notice.readAt
        ).getTime();

        if (Number.isNaN(readTime)) {
          return;
        }

        setMessages((previous) =>
          previous.map((message) =>
            message.senderId === currentUserId &&
            new Date(
              message.createdAt
            ).getTime() <= readTime
              ? {
                  ...message,
                  readAt: notice.readAt,
                  isSeen: true,
                }
              : message
          )
        );
      }
    );

    channel.on(
      "broadcast",
      { event: "typing_status" },
      ({ payload }) => {
        if (
          disposed ||
          payload?.conversationId !==
            conversationId ||
          payload?.userId !== recipientId
        ) {
          return;
        }

        setIsRecipientTyping(
          Boolean(payload.isTyping)
        );

        if (typingTimeoutRef.current) {
          clearTimeout(
            typingTimeoutRef.current
          );
        }

        if (payload.isTyping) {
          typingTimeoutRef.current =
            setTimeout(() => {
              setIsRecipientTyping(false);
            }, 3500);
        }
      }
    );

    channel
      .on(
        "presence",
        { event: "sync" },
        () => {
          if (disposed) return;

          const state =
            channel.presenceState();

          setIsRecipientOnline(
            Object.keys(state).includes(
              recipientId
            )
          );
        }
      )
      .on(
        "presence",
        { event: "join" },
        ({ key }) => {
          if (
            !disposed &&
            key === recipientId
          ) {
            setIsRecipientOnline(true);
          }
        }
      )
      .on(
        "presence",
        { event: "leave" },
        ({ key }) => {
          if (
            !disposed &&
            key === recipientId
          ) {
            setIsRecipientOnline(false);
          }
        }
      );

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
          if (disposed) return;

          const message =
            row as unknown as DirectMessagePayload;

          if (
            message?.conversationId !==
            conversationId
          ) {
            return;
          }

          appendOrUpdateMessage(message);

          if (
            message.senderId !==
            currentUserId
          ) {
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
          if (disposed) return;

          const message =
            row as unknown as DirectMessagePayload;

          if (
            message?.conversationId ===
            conversationId
          ) {
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
          if (disposed) return;

          const deletedId = (
            row as { id?: string }
          )?.id;

          if (!deletedId) return;

          setMessages((previous) => {
            if (
              !previous.some(
                (message) =>
                  message.id === deletedId
              )
            ) {
              return previous;
            }

            deletedMessageIdsRef.current.add(
              deletedId
            );

            return previous.filter(
              (message) =>
                message.id !== deletedId
            );
          });
        }
      );

    channel.subscribe((status, error) => {
      if (disposed) return;

      if (status === "SUBSCRIBED") {
        channelReadyRef.current = true;

        void channel
          .track({
            online_at:
              new Date().toISOString(),
          })
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
          console.error(
            "[DM Realtime] Channel status:",
            status,
            error
          );
        }
      }
    });

    document.addEventListener(
      "visibilitychange",
      handleReconnectOpportunity
    );
    window.addEventListener(
      "focus",
      handleReconnectOpportunity
    );
    window.addEventListener(
      "online",
      handleOnline
    );

    return () => {
      disposed = true;
      mountedRef.current = false;
      channelReadyRef.current = false;
      pendingBroadcastsRef.current = [];

      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }

      document.removeEventListener(
        "visibilitychange",
        handleReconnectOpportunity
      );
      window.removeEventListener(
        "focus",
        handleReconnectOpportunity
      );
      window.removeEventListener(
        "online",
        handleOnline
      );

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      if (
        flushingChannelRef.current ===
        channel
      ) {
        flushingChannelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [
    conversationId,
    currentUserId,
    recipientId,
    appendOrUpdateMessage,
    removeDeletedMessage,
    flushPendingBroadcasts,
    handleMarkAsRead,
    applyReactionUpdate,
  ]);

  const handleDeleteConversation =
    useCallback(() => {
      startDeleteConversationTransition(
        async () => {
          try {
            await deleteConversation(
              conversationId
            );

            router.push(
              `/${locale}/messages`
            );
            router.refresh();
          } catch (error) {
            console.error(
              "Failed to delete conversation:",
              error
            );
          }
        }
      );
    }, [conversationId, locale, router]);

  return {
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
  };
}
