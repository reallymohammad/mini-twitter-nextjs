export interface DirectMessageReplyPayload {
  id: string;
  senderId: string;
  content: string | null;

  // در خروجی فعلی اکشن‌ها انتخاب نشده‌اند؛ نباید اجباری باشند.
  createdAt?: string | Date;
  mediaUrls?: string[];
  deletedAt?: string | Date | null;

  sender?: {
    id: string;
    username?: string | null;
    fullName?: string | null;
    displayName?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    image?: string | null;
  } | null;
}
export interface DirectMessageReactionPayload {
  userId: string;
  emoji: string;
}

export interface DirectMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  mediaUrls: string[];
  createdAt: string | Date;
  readAt?: string | Date | null;
  isSeen?: boolean;
  deletedAt?: string | Date | null;
  replyToId?: string | null;
  replyTo?: DirectMessageReplyPayload | null;
  reactions?: DirectMessageReactionPayload[];

}

export interface MessageCursor {
  createdAt: string;
  id: string;
}
