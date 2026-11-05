"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@prisma/client";

type SafeUser = Omit<User, "passwordHash">;

const CurrentUserContext = createContext<SafeUser | null | undefined>(
  undefined,
);

export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SafeUser | null | undefined>(undefined);

  
useEffect(() => {
  fetch("/api/auth/me", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => setUser(data?.user ?? null))
    .catch(() => setUser(null));
}, []);



  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return context;
}
