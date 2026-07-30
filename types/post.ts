import type { Post, User, Like, PostType } from "@prisma/client";

export type PostWithRelations = Post & {
  author: Pick<User, "id" | "username" | "name" | "avatarUrl">;
  likes: { userId: string }[];
  retweets: { authorId: string }[];
  replies: { id: string }[];
  quotedPost?: PostWithRelations | null;
  originalPost?: PostWithRelations | null;
};
