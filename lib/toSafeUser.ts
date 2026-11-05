import type { User } from "@prisma/client";

export function toSafeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.coverImageUrl,
    bio: user.bio,
    isPrivate: user.isPrivate,
    badge: user.badge,
    role: user.role,
    createdAt: user.createdAt,
  };
}
