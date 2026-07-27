import type { User } from "@prisma/client";

export function toSafeUser(user: User) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
