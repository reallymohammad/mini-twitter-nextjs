"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  useMemo,
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
  Check,
  CheckCheck,
  Smile,
  AlertCircle,
} from "lucide-react";

import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import {
  markConversationAsRead,
  deleteConversation,
  deleteMessageForEveryone,
  deleteMessageForMe,
} from "@/lib/dm/actions";
import { supabase } from "@/lib/supabase/client";

export interface Recipient {
  id: string;
  name: string | null;
  username: string;
  avatarUrl: string | null;
  isOnline?: boolean;
  lastSeen?: string | Date | null;
}

export interface MessageItem {
  id: string;
  senderId: string;
  recipientId?: string;
  conversationId: string;
  text: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  readAt?: string | Date | null;
  isDeleted?: boolean;
  deletedFor?: string[];
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  recipient: Recipient;
  initialMessages: MessageItem[];
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  recipient,
  initialMessages,
}: ChatWindowProps) {
  const router = useRouter();

  // پیام‌ها و مدیریت استیت
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [isRecipientOnline, setIsRecipientOnline] = useState(
    Boolean(recipient.isOnline)
  );

  // مودال‌ها و منوها
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMessageForAction, setSelectedMessageForAction] =
    useState<MessageItem | null>(null);
  const [messageActionModalOpen, setMessageActionModalOpen] = useState(false);

  // وضعیت‌های Transition
  const [isDeletingConversation, startDeleteConversationTransition] =
    useTransition();
  const [isActionPending, startActionTransition] = useTransition();

  // اسکرول و دیده‌شدن
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // بررسی موقعیت اسکرول برای دکمه بازگشت به پایین
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 250;
    setShowScrollBottomButton(isFarFromBottom);
  }, []);

  // اسکرول به پایین
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  // علامت‌گذاری به عنوان خوانده‌شده
  const handleMarkAsRead = useCallback(async () => {
    try {
      await markConversationAsRead(conversationId);
      // ارسال سیگنال Broadcast برای طرف مقابل
      channelRef.current?.send({
        type: "broadcast",
        event: "read_notice",
        payload: { conversationId, readerId: currentUserId },
      });
    } catch (err) {
      console.error("[DM Realtime] Failed to mark as read:", err);
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    handleMarkAsRead();
  }, [handleMarkAsRead]);

  // جلوگیری از ایجاد پیام‌های تکراری و ادغام بهینه استیت
  const appendOrUpdateMessage = useCallback((newMessage: MessageItem) => {
    setMessages((prev) => {
      const index = prev.findIndex(
        (m) =>
          m.id === newMessage.id ||
          (m.text === newMessage.text &&
            m.senderId === newMessage.senderId &&
            Math.abs(
              new Date(m.createdAt).getTime() -
                new Date(newMessage.createdAt).getTime()
            ) < 3000)
      );

      if (index !== -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...newMessage };
        return updated;
      }
      return [...prev, newMessage];
    });
    setTimeout(() => scrollToBottom("smooth"), 60);
  }, [scrollToBottom]);

  // حذف پیام در استیت کلاینت
  const handleLocalMessageDelete = useCallback(
    (messageId: string, forEveryone: boolean) => {
      setMessages((prev) => {
        if (forEveryone) {
          return prev.filter((m) => m.id !== messageId);
        }
        return prev.filter((m) => m.id !== messageId);
      });
    },
    []
  );

  // اتصال بی‌درنگ به کانال سوپابیس (پشتیبانی از هر دو حالت Broadcast و Postgres Changes)
  useEffect(() => {
    const channelName = `dm:${conversationId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUserId },
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    // ۱. دریافت سریع پیام ارسالی طرف مقابل از طریق Broadcast
    channel.on("broadcast", { event: "new_message" }, (payload) => {
      const msg = payload.payload as MessageItem;
      if (msg && msg.conversationId === conversationId) {
        appendOrUpdateMessage(msg);
        if (msg.senderId !== currentUserId) {
          handleMarkAsRead();
        }
      }
    });

    // ۲. رویداد سینک خوانده شدن پیام‌ها
    channel.on("broadcast", { event: "read_notice" }, (payload) => {
      if (payload.payload?.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === currentUserId
              ? { ...msg, readAt: new Date().toISOString(), status: "read" }
              : msg
          )
        );
      }
    });

    // ۳. تایپینگ استاتوس (Typing Indicator)
    channel.on("broadcast", { event: "typing_status" }, (payload) => {
      if (payload.payload?.userId === recipient.id) {
        setIsRecipientTyping(Boolean(payload.payload.isTyping));

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        if (payload.payload.isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            setIsRecipientTyping(false);
          }, 3500);
        }
      }
    });

    // ۴. رویداد حذف پیام از طریق Broadcast
    channel.on("broadcast", { event: "delete_message" }, (payload) => {
      const { messageId, forEveryone } = payload.payload || {};
      if (messageId && forEveryone) {
        handleLocalMessageDelete(messageId, true);
      }
    });

    // ۵. حضور آنلاین/آفلاین کاربر (Presence)
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const isOnline = Object.keys(state).includes(recipient.id);
        setIsRecipientOnline(isOnline);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (key === recipient.id) setIsRecipientOnline(true);
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key === recipient.id) setIsRecipientOnline(false);
      });

    // ۶. لیسنر مستقیم دیتابیس Postgres Changes
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageItem;
          if (newMsg) {
            appendOrUpdateMessage(newMsg);
            if (newMsg.senderId !== currentUserId) {
              handleMarkAsRead();
            }
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
          const updatedMsg = payload.new as MessageItem;
          if (updatedMsg) {
            appendOrUpdateMessage(updatedMsg);
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
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) {
            handleLocalMessageDelete(deletedId, true);
          }
        }
      );

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [
    conversationId,
    currentUserId,
    recipient.id,
    appendOrUpdateMessage,
    handleMarkAsRead,
    handleLocalMessageDelete,
  ]);

  // ارسال استاتوس تایپینگ با Debounce به کلاینت مقابل
  const handleTypingEvent = useCallback(
    (isTyping: boolean) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing_status",
        payload: { userId: currentUserId, isTyping },
      });
    },
    [currentUserId]
  );

  // کال‌بک ارسال پیام از اینپوت
  const handleMessageSent = useCallback(
    (sentMessage: MessageItem) => {
      appendOrUpdateMessage(sentMessage);

      // برودکست بلافاصله برای طرف مقابل
      channelRef.current?.send({
        type: "broadcast",
        event: "new_message",
        payload: sentMessage,
      });

      // خاموش کردن تایپینگ خودمان در صفحه طرف مقابل
      handleTypingEvent(false);
    },
    [appendOrUpdateMessage, handleTypingEvent]
  );

  // حذف مکالمه
  const handleDeleteConversation = () => {
    startDeleteConversationTransition(async () => {
      try {
        await deleteConversation(conversationId);
        router.push("/messages");
        router.refresh();
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    });
  };

  // عملیات حذف تک پیام
  const handleDeleteMessageAction = (forEveryone: boolean) => {
    if (!selectedMessageForAction) return;
    const msgId = selectedMessageForAction.id;

    startActionTransition(async () => {
      try {
        if (forEveryone) {
          await deleteMessageForEveryone(msgId);
          // ارسال سیگنال حذف به طرف مقابل
          channelRef.current?.send({
            type: "broadcast",
            event: "delete_message",
            payload: { messageId: msgId, forEveryone: true },
          });
        } else {
          await deleteMessageForMe(msgId);
        }
        handleLocalMessageDelete(msgId, forEveryone);
        setMessageActionModalOpen(false);
        setSelectedMessageForAction(null);
      } catch (err) {
        console.error("Failed to delete message:", err);
      }
    });
  };

  // بستن منوی سه‌نقطه با کلیک بیرون
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  // دسته‌بندی پیام‌ها بر اساس روز برای نمایش برچسب تاریخ (Date Separator)
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; items: MessageItem[] }[] = [];

    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt);
      const isToday =
        new Date().toDateString() === msgDate.toDateString();
      const isYesterday =
        new Date(Date.now() - 86400000).toDateString() ===
        msgDate.toDateString();

      let dateLabel = msgDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (isToday) dateLabel = "Today";
      else if (isYesterday) dateLabel = "Yesterday";

      const currentGroup = groups[groups.length - 1];
      if (currentGroup && currentGroup.dateLabel === dateLabel) {
        currentGroup.items.push(msg);
      } else {
        groups.push({ dateLabel, items: [msg] });
      }
    });

    return groups;
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden select-none md:select-auto">
      {/* هدر چت */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            className="p-2 -ml-2 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Back to messages"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <Link
            href={`/${recipient.username}`}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted border border-border">
                {recipient.avatarUrl ? (
                  <Image
                    src={recipient.avatarUrl}
                    alt={recipient.name || recipient.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">
                    {(recipient.name || recipient.username)[0].toUpperCase()}
                  </div>
                )}
              </div>
              {/* نشانگر آنلاین بودن */}
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

        {/* منوی آپشن‌ها */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-2 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
            aria-label="Conversation options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-popover text-popover-foreground border border-border rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <Link
                href={`/${recipient.username}`}
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

      {/* بخش نمایش پیام‌ها */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-6"
      >
        {groupedMessages.map((group) => (
          <div key={group.dateLabel} className="space-y-3">
            {/* برچسب تفکیک تاریخ */}
            <div className="flex justify-center my-2">
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/40">
                {group.dateLabel}
              </span>
            </div>

            {/* حباب‌های پیام */}
            {group.items.map((msg) => (
              <div
                key={msg.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedMessageForAction(msg);
                  setMessageActionModalOpen(true);
                }}
              >
                <MessageBubble
                  message={msg}
                  isOwn={msg.senderId === currentUserId}
                  onOpenActionMenu={() => {
                    setSelectedMessageForAction(msg);
                    setMessageActionModalOpen(true);
                  }}
                />
              </div>
            ))}
          </div>
        ))}

        {/* وضعیت در حال تایپ طرف مقابل */}
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

      {/* دکمه اسکرول به پایین هنگام عقب ماندن */}
      {showScrollBottomButton && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-20 right-5 z-20 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all animate-in fade-in slide-in-from-bottom-2"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* فرم اینپوت پیام */}
      <div className="p-3 border-t border-border bg-background/95 backdrop-blur">
        <MessageInput
          conversationId={conversationId}
          recipientId={recipient.id}
          onMessageSent={handleMessageSent}
          onTypingChange={handleTypingEvent}
        />
      </div>

      {/* مودال تایید حذف کامل مکالمه */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold">Delete conversation?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will delete the entire conversation history from your inbox. This action cannot be undone.
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

      {/* مودال عملیات روی یک پیام خاص (حذف برای من / حذف برای همه) */}
      {messageActionModalOpen && selectedMessageForAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setMessageActionModalOpen(false)}
        >
          <div
            className="bg-card text-card-foreground border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold">Message options</h3>
            <div className="space-y-2">
              <button
                disabled={isActionPending}
                onClick={() => handleDeleteMessageAction(false)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-muted text-sm font-medium transition flex items-center justify-between"
              >
                <span>Delete for me</span>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* فقط فرستنده می‌تواند برای همه حذف کند */}
              {selectedMessageForAction.senderId === currentUserId && (
                <button
                  disabled={isActionPending}
                  onClick={() => handleDeleteMessageAction(true)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-destructive/10 text-destructive text-sm font-medium transition flex items-center justify-between"
                >
                  <span>Delete for everyone</span>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setMessageActionModalOpen(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
