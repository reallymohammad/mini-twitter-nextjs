// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { User } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSafeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    coverImageUrl: user.coverImageUrl,
    bio: user.bio,
    location: user.location,
    website: user.website,
    isPrivate: user.isPrivate,
    badge: user.badge,
    role: user.role,
    postsCount: user.postsCount,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    createdAt: user.createdAt,
  };
}
