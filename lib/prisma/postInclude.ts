// lib/prisma/postInclude.ts
import { Prisma } from "@prisma/client";

export function getPostInclude(userId?: string) {
  return {
    author: {
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        badge: true,
      },
    },
    likes: userId
      ? { where: { userId }, select: { userId: true } }
      : false,
    pinnedBy: { select: { userId: true } },
    retweetOf: {
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            badge: true,
          },
        },
        _count: { select: { likes: true, replies: true, retweets: true } },
      },
    },
    _count: { select: { likes: true, replies: true, retweets: true } },
  } satisfies Prisma.PostInclude;
}

export function getRetweetedByCurrentUser(posts: any[], userId?: string) {
  if (!userId) return new Set<string>();
  
  return new Set(
    posts
      .filter(p => p.type === "RETWEET" && p.authorId === userId)
      .map(p => p.retweetOfId)
      .filter(Boolean) as string[]
  );
}
