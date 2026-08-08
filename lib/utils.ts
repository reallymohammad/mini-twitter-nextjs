// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { User } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSafeUser(user: User) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
