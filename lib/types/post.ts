import { Post, User, Like, PostType, PinnedPost } from "@prisma/client";

export type PostWithRelations = Post & {
  author: Pick<User, "id" | "username" | "fullName" | "avatarUrl" | "badge">;
  _count: { likes: number; replies: number; retweets: number };
  likes: { userId: string }[];
  pinnedBy: { userId: string }[];  // 👈 اضافه شد
  retweetOf?: (Post & {
    author: Pick<User, "id" | "username" | "fullName" | "avatarUrl" | "badge">;
    _count: { likes: number; replies: number; retweets: number };
  }) | null;
};
