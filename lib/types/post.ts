import { Post, User, PostType } from "@prisma/client";

export type PostWithRelations = Post & {
  author: Pick<User, "id" | "username" | "fullName" | "avatarUrl" | "badge">;
  _count: { likes: number; replies: number; retweets: number };
  likes: { userId: string }[];
  retweets: { authorId: string; type: PostType }[];
  retweetOf?: (Post & {
    author: Pick<User, "id" | "username" | "fullName" | "avatarUrl" | "badge">;
    _count: { likes: number; replies: number; retweets: number };
  }) | null;
};
