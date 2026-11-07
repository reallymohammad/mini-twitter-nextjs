// lib/prisma/postInclude.ts
import { Prisma } from "@prisma/client";

export const authorSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  badge: true,
  isPrivate: true,
} as const;

export function getPostInclude(userId?: string) {
  return {
    author: {
      select: authorSelect,
    },

    likes: userId
      ? {
          where: { userId },
          select: { userId: true },
        }
      : false,

    reposts: userId
      ? {
          where: { userId },
          select: { userId: true },
        }
      : false,

    pinnedBy: userId
      ? {
          where: { userId },
          select: {
            userId: true,
            order: true,
          },
        }
      : false,

    quoteOf: {
      include: {
        author: {
          select: authorSelect,
        },
        _count: {
          select: {
            likes: true,
            replies: true,
            reposts: true,
            quotes: true,
          },
        },
      },
    },

    replyTo: {
      select: {
        id: true,
        content: true,
        author: {
          select: authorSelect,
        },
      },
    },

    _count: {
      select: {
        likes: true,
        replies: true,
        reposts: true,
        quotes: true,
        bookmarks: true,
      },
    },
  } satisfies Prisma.PostInclude;
}

export default getPostInclude;
