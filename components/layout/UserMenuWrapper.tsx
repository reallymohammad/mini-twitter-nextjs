"use client";

import { useEffect, useState } from "react";
import UserMenu from "./UserMenu";

interface SessionUser {
  username: string;
  avatarUrl?: string | null;
  fullName: string;
}

export default function UserMenuWrapper({
  initialUser,
}: {
  initialUser: SessionUser;
}) {
  const [user, setUser] = useState<SessionUser>(initialUser);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser({
            username: data.user.username,
            fullName: data.user.fullName ?? data.user.username,
            avatarUrl: data.user.avatarUrl,
          });
        }
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
      }
    } catch {
      // stay on current state
    }
  };

  useEffect(() => {
    fetchMe(); // fetch on mount to get initial sessionId
  }, []);

  useEffect(() => {
    window.addEventListener("account-switched", fetchMe);
    return () => window.removeEventListener("account-switched", fetchMe);
  }, []);

  return <UserMenu initialUser={user} activeSessionId={sessionId} />;
}
