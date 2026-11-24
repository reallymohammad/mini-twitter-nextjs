export type DeleteScope = "me" | "everyone";

export interface DirectMessage {
  id: string;
  senderId: string;
  content: string | null;
  mediaUrls: string[];
  createdAt: Date | string;
  isSeen?: boolean;
  reactions?: {
    userId: string;
    emoji: string;
  }[];
  sender?: {
    id?: string;
    fullName?: string | null;
    username?: string | null;
  } | null;
  replyTo?: {
    id: string;
    content: string | null;
    mediaUrls?: string[];
    sender?: {
      fullName?: string | null;
      username?: string | null;
    } | null;
  } | null;
}

export interface MessageBubbleProps {
  message: DirectMessage;
  currentUserId: string;
  isMine: boolean;
  onDeleted?: (messageId: string) => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelected: (messageId: string) => void;
  onStartSelection: (messageId: string) => void;
  onToggleReaction?: (
    messageId: string,
    emoji: string
  ) => Promise<unknown>;
  onReply?: (target: {
    id: string;
    senderName: string;
    content: string | null;
    hasMedia?: boolean;
  }) => void;
  onScrollToMessage?: (messageId: string) => void;
}
