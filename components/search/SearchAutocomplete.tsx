"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import Avatar from "@/components/ui/Avatar";

interface SearchAutocompleteProps {
  locale: string;
}

interface SearchUser {
  id: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  image?: string | null;
}

interface SearchPost {
  id: string;
  content?: string | null;
  author?: {
    username?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    image?: string | null;
  } | null;
}

interface SearchResults {
  users: SearchUser[];
  posts: SearchPost[];
}

function extractItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items: unknown }).items)
  ) {
    return (value as { items: T[] }).items;
  }

  return [];
}

export function SearchAutocomplete({
  locale,
}: SearchAutocompleteProps) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [results, setResults] = useState<SearchResults>({
    users: [],
    posts: [],
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // بستن منو هنگام کلیک خارج از کامپوننت
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // جستجوی زنده با Debounce و مدیریت AbortController
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults({
        users: [],
        posts: [],
      });
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&type=all&limit=4`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const responseText = await response.text();

        if (!response.ok) {
          console.error(`[Search API Error] HTTP ${response.status}:`, responseText);
          setResults({
            users: [],
            posts: [],
          });
          return;
        }

        let data: unknown;

        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("[Search API] Invalid JSON received:", responseText);
          setResults({
            users: [],
            posts: [],
          });
          return;
        }

        if (!data || typeof data !== "object") {
          setResults({
            users: [],
            posts: [],
          });
          return;
        }

        const responseData = data as {
          users?: unknown;
          posts?: unknown;
        };

        const users = extractItems<SearchUser>(responseData.users);
        const posts = extractItems<SearchPost>(responseData.posts);

        setResults({
          users,
          posts,
        });
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("[Search API Fetch Exception]:", error);
        setResults({
          users: [],
          posts: [],
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;

    setIsOpen(false);
    router.push(`/${locale}/search?q=${encodeURIComponent(trimmed)}`);
  };

  const hasResults = results.users.length > 0 || results.posts.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) {
              setIsOpen(true);
            }
          }}
          placeholder="جستجو در Y..."
          className="h-11 rounded-full border-none bg-muted/60 ps-10 pe-9 text-sm transition-all focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/40"
        />

        {isLoading ? (
          <Loader2 className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            aria-label="پاک کردن جستجو"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              setResults({
                users: [],
                posts: [],
              });
            }}
            className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </form>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute inset-x-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl divide-y divide-border/40">
          <Link
            href={`/${locale}/search?q=${encodeURIComponent(query.trim())}`}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 text-sm font-medium text-primary transition-colors hover:bg-accent/60"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">جستجوی «{query}»</span>
          </Link>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>در حال جستجو...</span>
            </div>
          )}

          {!isLoading && results.users.length > 0 && (
            <div className="space-y-1 p-2">
              <span className="px-2 text-xs font-semibold text-muted-foreground">
                کاربران
              </span>

              {results.users.map((user) => (
                <Link
                  key={user.id}
                  href={`/${locale}/${user.username}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent"
                >
                 <Avatar
  name={user.fullName || user.username || "User"}
  size={36}
/>


                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-none">
                      {user.fullName || user.username}
                    </p>
                    <p className="mt-1 truncate text-start text-xs text-muted-foreground dir-ltr">
                      @{user.username}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && results.posts.length > 0 && (
            <div className="space-y-1 p-2">
              <span className="px-2 text-xs font-semibold text-muted-foreground">
                پست‌ها
              </span>

              {results.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/${locale}/post/${post.id}`}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-xl p-2 transition-colors hover:bg-accent"
                >
                  <p className="mb-0.5 truncate text-xs text-muted-foreground">
                    {post.author?.fullName ||
                      post.author?.username ||
                      "کاربر"}

                    {post.author?.username && (
                      <>
                        {" "}
                        <span className="dir-ltr">
                          @{post.author.username}
                        </span>
                      </>
                    )}
                  </p>

                  <p className="line-clamp-1 text-sm text-foreground/90">
                    {post.content || ""}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && !hasResults && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              هیچ نتیجه‌ای برای «{query}» پیدا نشد.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
