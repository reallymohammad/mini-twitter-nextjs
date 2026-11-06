"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Trash2, Loader2 } from "lucide-react";

import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import {
  markConversationAsRead,
  deleteConversation,
} from "@/lib/dm/actions";
import { supabase } from "@/lib/supabase/client";

interface Recipient {
  id: string;
  name: string;
  username: string;
  image: string | null;
  badge?: string | null;
}

interface Message {
  id: string;
  senderId: string;
  content: string | null;
  mediaUrls: string[];
  createdAt: Date | string;
  isSeen?: boolean;
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  recipient: Recipient | null;
  messages: Message[];
  locale?: string;
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  recipient,
  messages: initialMessages = [],
  locale,
}: ChatWindowProps) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const connectedRef = useRef(false);
  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messagesList, setMessagesList] =
    useState<Message[]>(initialMessages);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    setMessagesList(initialMessages);
  }, [initialMessages]);

  const sendTypingEvent = useCallback(
    (isTyping: boolean) => {
      const channel = channelRef.current;

      if (!channel || !connectedRef.current) {
        console.warn("[DM Realtime] typing not sent: channel offline", {
          conversationId,
          isTyping,
        });
        return;
      }

      void channel
        .send({
          type: "broadcast",
          event: "typing",
          payload: { senderId: currentUserId, isTyping },
        })
        .then((result) => {
          console.debug("[DM Realtime] typing sent", {
            conversationId,
            isTyping,
            result,
          });
        })
        .catch((error: unknown) => {
          console.error("[DM Realtime] typing send failed", {
            conversationId,
            error,
          });
        });
    },
    [conversationId, currentUserId]
  );

  useEffect(() => {
    let active = true;
    let hasConnectedBefore = false;
    let pendingReadNotice = false;

    const channelName = `dm:${conversationId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true, self: false },
      },
    });

    channelRef.current = channel;
    connectedRef.current = false;

    console.info("[DM Realtime][diagnostic] listener registered", {
      conversationId,
      channelName,
      table: "public.Message",
      insertSubscription: "unfiltered (temporary diagnostic)",
    });

    const sendReadNotice = async () => {
      if (!active || !connectedRef.current) {
        pendingReadNotice = true;
        return;
      }

      pendingReadNotice = false;

      try {
        const result = await channel.send({
          type: "broadcast",
          event: "read",
          payload: { senderId: currentUserId },
        });

        console.debug("[DM Realtime] read notice sent", {
          conversationId,
          result,
        });
      } catch (error) {
        console.error("[DM Realtime] read notice failed", {
          conversationId,
          error,
        });
      }
    };

    const markRead = async () => {
      try {
        await markConversationAsRead(conversationId);
        if (!active) return;

        console.debug("[DM Realtime] mark-read:success", {
          conversationId,
        });
        await sendReadNotice();
      } catch (error) {
        console.error("[DM Realtime] mark-read:failed", {
          conversationId,
          error,
        });
      }
    };

    void markRead();

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          // فقط برای تست: فیلتر سمت Supabase موقتاً حذف شده است.
        },
        (payload) => {
          if (!active) return;

          const newRow = payload.new as Record<string, unknown>;
          const eventConversationId = newRow.conversationId;
          const messageId = newRow.id;
          const senderId = newRow.senderId;
          const matchesCurrentConversation =
            eventConversationId === conversationId;

          // عمداً کل payload را لاگ نمی‌کنیم، چون محتوای پیام دارد.
          console.info("[DM Realtime][diagnostic] INSERT unfiltered", {
            conversationId,
            eventConversationId: eventConversationId ?? null,
            messageId: messageId ?? null,
            matchesCurrentConversation,
          });

          // جلوگیری از نمایش پیام گفتگوهای دیگر در همین پنجره
          if (!matchesCurrentConversation) return;

          if (
            typeof messageId !== "string" ||
            typeof senderId !== "string"
          ) {
            console.warn("[DM Realtime] INSERT has unexpected fields", {
              conversationId,
              messageId,
              senderId,
            });
            return;
          }

          const newMsg = payload.new as unknown as Message;

          setMessagesList((prev) => {
            if (prev.some((message) => message.id === newMsg.id)) {
              return prev;
            }

            return [
              ...prev,
              { ...newMsg, mediaUrls: newMsg.mediaUrls ?? [] },
            ];
          });

          if (newMsg.senderId !== currentUserId) {
            void markRead();
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
        (payload) => {
          if (!active) return;

          const updatedMsg = payload.new as Partial<Message> & {
            id: string;
          };

          console.info("[DM Realtime] UPDATE", {
            conversationId,
            messageId: updatedMsg.id,
            hasIsSeenField: "isSeen" in updatedMsg,
          });

          setMessagesList((prev) =>
            prev.map((message) =>
              message.id === updatedMsg.id
                ? { ...message, ...updatedMsg }
                : message
            )
          );

          if (!("isSeen" in updatedMsg)) router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          if (!active) return;

          const deletedId = payload.old?.id;

          console.info("[DM Realtime] DELETE", {
            conversationId,
            messageId: deletedId,
          });

          if (typeof deletedId === "string") {
            setMessagesList((prev) =>
              prev.filter((message) => message.id !== deletedId)
            );
          }
        }
      )
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }) => {
          if (!active) return;
          if (payload?.senderId === currentUserId) return;
          if (typeof payload?.isTyping !== "boolean") return;

          console.debug("[DM Realtime] typing received", {
            conversationId,
            isTyping: payload.isTyping,
          });

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          setIsOtherUserTyping(payload.isTyping);

          if (payload.isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsOtherUserTyping(false);
            }, 3500);
          }
        }
      )
      .on(
        "broadcast",
        { event: "read" },
        ({ payload }) => {
          if (!active) return;
          if (payload?.senderId === currentUserId) return;

          console.info("[DM Realtime] read notice received", {
            conversationId,
          });

          router.refresh();
        }
      )
      .subscribe((status, error) => {
        console.info("[DM Realtime] channel status", {
          conversationId,
          status,
          error: error?.message,
        });

        if (!active) return;

        if (status === "SUBSCRIBED") {
          connectedRef.current = true;

          if (pendingReadNotice) {
            void sendReadNotice();
          }

          if (hasConnectedBefore) {
            void markRead();
          }

          hasConnectedBefore = true;
          router.refresh();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          connectedRef.current = false;
          setIsOtherUserTyping(false);
        }
      });

    return () => {
      active = false;
      connectedRef.current = false;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      void channel
        .unsubscribe()
        .then(() => supabase.removeChannel(channel))
        .catch((error: unknown) => {
          console.error("[DM Realtime] channel cleanup failed", {
            conversationId,
            error,
          });
        });
    };
  }, [conversationId, currentUserId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList.length, isOtherUserTyping]);

  const handleDeleteConversation = () => {
    startDeleteTransition(async () => {
      try {
        await deleteConversation(conversationId);
        setShowConfirmDelete(false);

        const targetUrl = locale
          ? `/${locale}/messages`
          : "/messages";

        router.push(targetUrl);
        router.refresh();
      } catch (error) {
        console.error("[DM] delete conversation failed", {
          conversationId,
          error,
        });
      }
    });
  };

  const displayName =
    recipient?.name || recipient?.username || "Deleted Account";
  const username = recipient?.username;
  const avatarInitial = (displayName.charAt(0) || "?").toUpperCase();
  const profileHref =
    locale && username ? `/${locale}/${username}` : undefined;

  const profileContent = (
    <>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted sm:h-10 sm:w-10">
        {recipient?.image ? (
          <Image
            src={recipient.image}
            alt={displayName}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">
            {avatarInitial}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold leading-tight text-foreground">
          {displayName}
        </h2>
        {username && (
          <p className="truncate text-xs text-muted-foreground">
            @{username}
          </p>
        )}
      </div>
    </>
  );

  return (
    <div className="relative flex h-full flex-col bg-background md:border-x md:border-border">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-3">
          {locale && (
            <Link
              href={`/${locale}/messages`}
              aria-label="Back to messages"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}

          {profileHref ? (
            <Link
              href={profileHref}
              className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
            >
              {profileContent}
            </Link>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              {profileContent}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Conversation options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute left-0 z-30 mt-1 w-48 animate-in rounded-xl border border-border bg-popover p-1 shadow-lg fade-in-0 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowConfirmDelete(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>حذف گفتگو</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-y-auto px-3 py-3 sm:px-4">
        {messagesList.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <p className="text-sm">هنوز پیامی رد و بدل نشده است.</p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              اولین پیام را ارسال کنید!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messagesList.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isMine={message.senderId === currentUserId}
              />
            ))}
          </div>
        )}

        {isOtherUserTyping && (
          <div
            role="status"
            aria-label="کاربر مقابل در حال تایپ است"
            className="mt-2 flex w-fit items-center gap-1 rounded-2xl bg-muted px-3 py-2"
          >
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-300ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <MessageInput
        conversationId={conversationId}
        onTypingChange={sendTypingEvent}
      />

      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-in rounded-2xl border border-border bg-card p-6 shadow-xl fade-in-0 zoom-in-95">
            <h3 className="text-base font-bold text-foreground">
              حذف گفتگو؟
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              این گفتگو از صندوق پیام‌های شما حذف خواهد شد. طرف مقابل
              همچنان پیام‌ها را خواهد دید مگر اینکه او نیز گفتگو را حذف کند.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmDelete(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConversation}
                className="flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>حذف گفتگو</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
