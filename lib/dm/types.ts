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
}

export interface MessageCursor {
  createdAt: string;
  id: string;
}
