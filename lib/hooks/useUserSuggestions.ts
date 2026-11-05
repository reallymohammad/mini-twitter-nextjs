// lib/hooks/useUserSuggestions.ts
"use client";

import { useState, useEffect, useRef } from "react";

export interface SuggestedUser {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export function useUserSuggestions(query: string) {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      // کنسل کردن درخواست قبلی
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      console.log("[useUserSuggestions] fetching:", trimmed);

      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );

        console.log("[useUserSuggestions] status:", res.status);

        const text = await res.text();
        console.log("[useUserSuggestions] raw response:", text);

        if (!res.ok) {
          console.error("[useUserSuggestions] HTTP error:", res.status, text);
          setUsers([]);
          return;
        }

        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("[useUserSuggestions] JSON parse error:", e);
          setUsers([]);
          return;
        }

        console.log("[useUserSuggestions] parsed data:", data);

        const arr =
          data &&
          typeof data === "object" &&
          "users" in data &&
          Array.isArray((data as { users: unknown }).users)
            ? (data as { users: SuggestedUser[] }).users
            : [];

        console.log("[useUserSuggestions] final users array:", arr);
        setUsers(arr);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          console.log("[useUserSuggestions] aborted");
          return;
        }
        console.error("[useUserSuggestions] fetch error:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return { users, loading };
}
