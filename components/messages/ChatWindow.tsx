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
} from "lucide-react";

import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import {
  markConversationAsRead,
  deleteConversation,
} from "@/lib/dm/actions";
import { supabase } from "@/lib/supabase/client";

export interface Recipient {
  id: string;
  name: string | null;
  username: string;
  image?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

export interface MessageItem {
  id: string;
  senderId: string;
  conversationId: string;
  content: string | null;
  text?: string;
  mediaUrls: string[];
  createdAt: string | Date;
  readAt?: string | Date | null;
  isSeen?: boolean;
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  recipient: Recipient;
  messages: any[];
  locale?: string;
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  recipient,
  messages: initialMessages,
  locale = "fa",
}: ChatWindowProps) {
  const router = useRouter();

  const normalizeIncomingMessage = useCallback(
    (raw: any): MessageItem => {
      return {
        id: raw.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        senderId: raw.senderId || "",
        conversationId: raw.conversationId || conversationId,
        content: raw.content ?? raw.text ?? null,
        mediaUrls: Array.isArray(raw.mediaUrls) ? raw.mediaUrls : [],
        createdAt: raw.createdAt || new Date().toISOString(),
        readAt: raw.readAt ?? null,
        isSeen: raw.isSeen ?? Boolean(raw.readAt),
      };
    },
    [conversationId]
  );

  const [messages, setMessages] = useState<MessageItem[]>(() =>
    (initialMessages || []).map(normalizeIncomingMessage)
  );

  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [isRecipientOnline, setIsRecipientOnline] = useState(
    Boolean(recipient.isOnline)
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeletingConversation, startDeleteConversationTransition] =
    useTransition();

  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const avatarSrc = recipient.image || recipient.avatarUrl || null;

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 250;
    setShowScrollBottomButton(isFarFromBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  const handleMarkAsRead = useCallback(async () => {
    try {
      await markConversationAsRead(conversationId);
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

  const appendOrUpdateMessage = useCallback(
    (incoming: any) => {
      const normalized = normalizeIncomingMessage(incoming);

      setMessages((prev) => {
        const index = prev.findIndex(
          (m) =>
            m.id === normalized.id ||
            (m.content === normalized.content &&
              m.senderId === normalized.senderId &&
              Math.abs(
                new Date(m.createdAt).getTime() -
                  new Date(normalized.createdAt).getTime()
              ) < 3000)
        );

        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...normalized };
          return updated;
        }
        return [...prev, normalized];
      });
      setTimeout(() => scrollToBottom("smooth"), 60);
    },
    [normalizeIncomingMessage, scrollToBottom]
  );

  useEffect(() => {
    const channelName = `dm:${conversationId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUserId },
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    channel.on("broadcast", { event: "new_message" }, (payload) => {
      const msg = payload.payload;
      if (msg && msg.conversationId === conversationId) {
        appendOrUpdateMessage(msg);
        if (msg.senderId !== currentUserId) {
          handleMarkAsRead();
        }
      }
    });

    channel.on("broadcast", { event: "read_notice" }, (payload) => {
      if (payload.payload?.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === currentUserId
              ? { ...msg, readAt: new Date().toISOString(), isSeen: true }
              : msg
          )
        );
      }
    });

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
          const newMsg = payload.new;
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
          const updatedMsg = payload.new;
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
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
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
  ]);

  const handleDeleteConversation = () => {
    startDeleteConversationTransition(async () => {
      try {
        await deleteConversation(conversationId);
        router.push(`/${locale}/messages`);
        router.refresh();
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    });
  };

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
                    {(recipient.name || recipient.username)[0]?.toUpperCase() || "?"}
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
            onClick={() => setMenuOpen((prev) => !prev)}
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

            {group.items.map((msg) => (
              <MessageBubble
                key={msg.id}
                isMine={msg.senderId === currentUserId}
                message={{
                  id: msg.id,
                  senderId: msg.senderId,
                  content: msg.content,
                  mediaUrls: msg.mediaUrls,
                  createdAt: msg.createdAt,
                  isSeen: msg.isSeen,
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
        <MessageInput conversationId={conversationId} />
      </div>

      {/* Delete Conversation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
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
    </div>
  );
}
