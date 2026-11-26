// components/notifications/types.ts
import type { NotificationType } from "@prisma/client";

export interface NotificationActor {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface NotificationPost {
  id: string;
  content: string;
}

export interface NotificationMessage {
  id: string;
  conversationId: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date | string;
  recipientId: string;
  actorId: string;
  postId?: string | null;
  messageId?: string | null;
  actor?: NotificationActor | null;
  post?: NotificationPost | null;
  message?: NotificationMessage | null;
}

export type NotificationDisplayItem =
  | {
      kind: "single";
      id: string;
      notification: NotificationItem;
    }
  | {
      kind: "follow-group";
      id: string;
      notifications: NotificationItem[];
    }
  | {
      kind: "post-interaction-group";
      id: string;
      type: "LIKE" | "REPOST";
      postId: string;
      notifications: NotificationItem[];
    };
