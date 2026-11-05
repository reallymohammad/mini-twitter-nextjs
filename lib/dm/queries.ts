import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function getCurrentUserId() {
  const user = await getCurrentUser();

  if (!user || user.deletedAt) {
    return null;
  }

  return user.id;
}

/**
 * فهرست گفتگوهای دونفرهٔ فعال کاربر.
 */
export async function getInboxConversations() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const memberships = await prisma.userConversation.findMany({
    where: {
      userId,
      isDeleted: false,
      conversation: {
        isGroup: false,
      },
    },
    select: {
      conversationId: true,
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          createdAt: true,
          participants: {
            where: {
              userId: { not: userId },
            },
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  avatarUrl: true,
                  deletedAt: true,
                },
              },
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
            select: {
              id: true,
              senderId: true,
              content: true,
              mediaUrls: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const conversations = await Promise.all(
    memberships.map(async (membership) => {
      const lastReadFilter = membership.lastReadAt
        ? { createdAt: { gt: membership.lastReadAt } }
        : {};

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: membership.conversationId,
          deletedAt: null,
          senderId: { not: userId },
          ...lastReadFilter,
        },
      });

      const lastMessage = membership.conversation.messages[0] ?? null;
      const otherParticipant =
        membership.conversation.participants[0]?.user ?? null;

      return {
        id: membership.conversation.id,
        createdAt: membership.conversation.createdAt,
        participant:
          otherParticipant?.deletedAt == null ? otherParticipant : null,
        lastMessage,
        unreadCount,
      };
    })
  );

  // در حال حاضر گفتگوها را پس از واکشی بر اساس آخرین پیام مرتب می‌کنیم.
  // برای صندوق ورودی بسیار بزرگ بهتر است بعداً lastMessageAt به Conversation اضافه شود.
  return conversations.sort((a, b) => {
    const aDate = a.lastMessage?.createdAt ?? a.createdAt;
    const bDate = b.lastMessage?.createdAt ?? b.createdAt;
    return bDate.getTime() - aDate.getTime();
  });
}

/**
 * دریافت آخرین پیام‌های یک گفت‌وگوی دونفره.
 * limit بین 1 تا 100 محدود می‌شود.
 */
export async function getDirectConversationMessages(
  conversationId: string,
  limit = 30
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("برای دیدن پیام‌ها باید وارد حساب کاربری شوید.");
  }

  const membership = await prisma.userConversation.findUnique({
    where: {
      userId_conversationId: { userId, conversationId },
    },
    select: {
      conversation: {
        select: { isGroup: true },
      },
    },
  });

  if (!membership) {
    throw new Error("شما عضو این گفتگو نیستید.");
  }

  if (membership.conversation.isGroup) {
    throw new Error("خواندن پیام‌های گروهی هنوز پیاده‌سازی نشده است.");
  }

  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit) || 30));

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: safeLimit,
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      content: true,
      mediaUrls: true,
      createdAt: true,
      sender: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // دیتابیس را نزولی واکشی می‌کنیم تا آخرین پیام‌ها بگیریم،
  // سپس برای نمایش در چت، ترتیب را صعودی برمی‌گردانیم.
  return messages.reverse();
}
export async function getUnreadMessagesCount(): Promise<number> {
  const user = await getCurrentUser();

  if (!user || user.deletedAt) return 0;

  const conversations = await prisma.userConversation.findMany({
    where: {
      userId: user.id,
      isDeleted: false,
    },
    select: {
      conversationId: true,
      lastReadAt: true,
      deletedAt: true,
    },
  });

  if (conversations.length === 0) return 0;

  const unreadConditions = conversations.map((participant) => {
    const readAfter = [
      participant.lastReadAt,
      participant.deletedAt,
    ]
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      conversationId: participant.conversationId,
      ...(readAfter ? { createdAt: { gt: readAfter } } : {}),
    };
  });

  return prisma.message.count({
    where: {
      senderId: { not: user.id },
      deletedAt: null,
      OR: unreadConditions,
    },
  });
}