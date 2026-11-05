import type { Post, User } from "@prisma/client";

export type PostType = "POST" | "REPLY" | "QUOTE";

export type PostWithRelations = Post & {
  author: Pick<User, "id" | "username" | "fullName" | "avatarUrl" | "badge">;
  _count: { likes: number; replies: number; reposts: number };
  likes: { userId: string }[];
  reposts: { userId: string }[];
  bookmarks?: { userId: string }[];
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  pinnedBy: { userId: string }[];
  replyTo?: (Post & {
    author: Pick<User, "id" | "username" | "fullName" | "avatarUrl" | "badge">;
  }) | null;
  quotedPost?: (Post & {
    author: Pick<User, "id" | "username" | "fullName" | "avatarUrl" | "badge">;
    _count: { likes: number; replies: number; reposts: number };
  }) | null;
};
