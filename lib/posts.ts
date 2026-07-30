import { prisma } from "@/lib/prisma";
import type { PostWithRelations } from "@/types/post";

const postInclude = {
  author: { select: { id: true, username: true, name: true, avatarUrl: true } },
  likes: { select: { userId: true } },
  retweets: { select: { authorId: true } },
  replies: { select: { id: true } },
  quotedPost: {
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true } },
      likes: { select: { userId: true } },
      retweets: { select: { authorId: true } },
      replies: { select: { id: true } },
    },
  },
} as const;

export async function getHomeFeed(userId: string): Promise<PostWithRelations[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const followingIds = following.map((f) => f.followingId);

  return prisma.post.findMany({
    where: {
      authorId: { in: [...followingIds, userId] },
      type: { in: ["POST", "RETWEET", "QUOTE"] },
    },
    include: postInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  }) as Promise<PostWithRelations[]>;
}
