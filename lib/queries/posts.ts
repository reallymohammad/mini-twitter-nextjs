import { Prisma } from "@prisma/client";

export const postInclude = {
  author: {
    select: { id: true, username: true, name: true, avatarUrl: true },
  },
  likes: { select: { userId: true } },
  retweets: { select: { authorId: true } },
  replies: { select: { id: true } },
  quotedPost: {
    include: {
      author: {
        select: { id: true, username: true, name: true, avatarUrl: true },
      },
      likes: { select: { userId: true } },
      retweets: { select: { authorId: true } },
      replies: { select: { id: true } },
    },
  },
  originalPost: {
    include: {
      author: {
        select: { id: true, username: true, name: true, avatarUrl: true },
      },
      likes: { select: { userId: true } },
      retweets: { select: { authorId: true } },
      replies: { select: { id: true } },
    },
  },
} satisfies Prisma.PostInclude;

export type PostWithRelations = Prisma.PostGetPayload<{
  include: typeof postInclude;
}>;
