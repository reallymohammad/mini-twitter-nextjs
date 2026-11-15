"use client";

import { useState } from "react";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { Search, User, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import FollowButton from "@/components/user/FollowButton";

export type FollowListItem = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  isFollowing: boolean;
  followsYou: boolean;
};

type Props = {
  items: FollowListItem[];
  mode: "client" | "server";
  initialQuery: string;
  locale: string;
  profileUsername: string;
  kind: "followers" | "following";
  currentUserId?: string;
};

export default function FollowListSearch({
  items,
  mode,
  initialQuery,
  locale,
  profileUsername,
  kind,
  currentUserId,
}: Props) {
  const t = useTranslations("followList");
  const [query, setQuery] = useState(initialQuery);

  const path = `/${locale}/${encodeURIComponent(profileUsername)}/${kind}`;

  // در حالت client همه اعضا (حداکثر ۳۰۰ نفر) قبلاً دریافت شده‌اند.
  const normalizedQuery = query.trim().replace(/^@/, "").toLocaleLowerCase();

  const visibleItems =
    mode === "client" && normalizedQuery
      ? items.filter(
          (user) =>
            user.username.toLocaleLowerCase().includes(normalizedQuery) ||
            user.fullName.toLocaleLowerCase().includes(normalizedQuery)
        )
      : items;

  const inputClassName =
    "h-10 rounded-full border-none bg-muted/60 ps-10 pe-9 text-sm " +
    "focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <>
      <div className="border-b border-border px-4 py-3">
        {mode === "client" ? (
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="search"
              aria-label={t("searchAria")}
              placeholder={t("searchPlaceholder")}
              value={query}
              maxLength={100}
              onChange={(event) => setQuery(event.target.value)}
              className={inputClassName}
            />

            {query && (
              <button
                type="button"
                aria-label={t("clearSearch")}
                onClick={() => setQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <Form action={path} className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                key={initialQuery}
                type="search"
                name="q"
                aria-label={t("searchAria")}
                placeholder={t("searchPlaceholder")}
                defaultValue={initialQuery}
                maxLength={100}
                className={inputClassName}
              />
            </div>

            <button
              type="submit"
              className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              {t("submit")}
            </button>

            {initialQuery && (
              <Link
                href={path}
                aria-label={t("clearSearch")}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </Form>
        )}
      </div>

      <div className="divide-y divide-border">
        {visibleItems.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {mode === "client"
              ? query.trim()
                ? t("notFound")
                : t("emptyList")
              : initialQuery
                ? t("notFound")
                : t("emptyList")}
          </p>
        ) : (
          visibleItems.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30"
            >
              <Link
                href={`/${locale}/${encodeURIComponent(user.username)}`}
                className="flex min-w-0 flex-1 items-start gap-3"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.fullName || user.username}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold hover:underline">
                      {user.fullName || user.username}
                    </span>

                    {user.followsYou && user.id !== currentUserId && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {t("followsYou")}
                      </span>
                    )}
                  </div>

                  <p className="truncate text-xs text-muted-foreground">
                    @{user.username}
                  </p>

                  {user.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-foreground/90">
                      {user.bio}
                    </p>
                  )}
                </div>
              </Link>

              {user.id !== currentUserId && (
                <FollowButton
                  targetUserId={user.id}
                  initialIsFollowing={user.isFollowing}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
