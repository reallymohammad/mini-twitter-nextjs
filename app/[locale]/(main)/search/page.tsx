// app/[locale]/(main)/search/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  searchPostsTop,
  searchPostsLatest,
  searchUsers,
  type SearchPostResult,
  type SearchUserResult,
} from "@/lib/search/query";

type Tab = "top" | "latest" | "people";

function getTab(v: unknown): Tab {
  return v === "latest" || v === "people" || v === "top" ? v : "top";
}

function buildHref(locale: string, q: string, tab: Tab, extra?: Record<string, string>) {
  const sp = new URLSearchParams();
  sp.set("q", q);
  sp.set("tab", tab);
  if (extra) for (const [k, val] of Object.entries(extra)) sp.set(k, val);
  return `/${locale}/search?${sp.toString()}`;
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; tab?: string; page?: string }>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);

  const q = (sp.q ?? "").trim();
  const tab = getTab(sp.tab);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  if (!q) {
    redirect(`/${locale}`);
  }

  const currentUser = await getCurrentUser();
  const viewerId = currentUser?.id ?? null;

  let posts: SearchPostResult[] = [];
  let users: SearchUserResult[] = [];
  let usersHasMore = false;

  if (tab === "top") {
    const [postsRes, usersRes] = await Promise.all([
      searchPostsTop({ query: q, viewerId, limit: 20 }),
      searchUsers({ query: q, viewerId, limit: 10, offset: 0 }),
    ]);
    posts = postsRes.items;
    users = usersRes.items;
    usersHasMore = usersRes.hasMore;
  }

  if (tab === "latest") {
    const res = await searchPostsLatest({ query: q, viewerId, limit: 20 });
    posts = res.items;
  }

  if (tab === "people") {
    const offset = (page - 1) * 20;
    const res = await searchUsers({ query: q, viewerId, limit: 20, offset });
    users = res.items;
    usersHasMore = res.hasMore;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "top", label: "Top" },
    { key: "latest", label: "Latest" },
    { key: "people", label: "People" },
  ];

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="px-4 py-3">
          <div className="text-sm text-muted-foreground">Search results for</div>
          <div className="text-base font-semibold break-words">&ldquo;{q}&rdquo;</div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2">
          {tabs.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                href={buildHref(locale, q, t.key)}
                className={[
                  "px-4 py-1.5 rounded-full text-sm font-medium transition",
                  active ? "bg-foreground text-background" : "hover:bg-muted/60 text-muted-foreground",
                ].join(" ")}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-border">
        {tab === "top" && (
          <>
            {users.length > 0 && (
              <section className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">People</h2>
                <div className="space-y-2">
                  {users.map((u) => (
                    <UserRow key={u.id} locale={locale} user={u} />
                  ))}
                </div>
                {usersHasMore && (
                  <div className="mt-3">
                    <Link
                      className="text-sm font-medium text-primary hover:underline"
                      href={buildHref(locale, q, "people")}
                    >
                      View all people
                    </Link>
                  </div>
                )}
              </section>
            )}

            <section className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Posts</h2>
              {posts.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">No posts found.</div>
              ) : (
                <div className="space-y-3">
                  {posts.map((p) => (
                    <SearchPostItem key={p.id} locale={locale} post={p} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === "latest" && (
          <section className="p-4">
            {posts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No posts found.</div>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <SearchPostItem key={p.id} locale={locale} post={p} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "people" && (
          <section className="p-4">
            {users.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No users found.</div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <UserRow key={u.id} locale={locale} user={u} />
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-5 flex items-center justify-between pt-4 border-t border-border">
              <Link
                aria-disabled={page <= 1}
                className={[
                  "text-sm font-medium px-4 py-2 rounded-lg border border-border",
                  page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-accent",
                ].join(" ")}
                href={buildHref(locale, q, "people", { page: String(page - 1) })}
              >
                Previous
              </Link>

              <div className="text-xs text-muted-foreground">Page {page}</div>

              <Link
                aria-disabled={!usersHasMore}
                className={[
                  "text-sm font-medium px-4 py-2 rounded-lg border border-border",
                  !usersHasMore ? "pointer-events-none opacity-40" : "hover:bg-accent",
                ].join(" ")}
                href={buildHref(locale, q, "people", { page: String(page + 1) })}
              >
                Next
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function UserRow({ locale, user }: { locale: string; user: SearchUserResult }) {
  return (
    <Link
      href={`/${locale}/${user.username}`}
      className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-accent/30 transition"
    >
      <div className="size-10 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.username} className="size-10 object-cover" />
        ) : (
          <div className="text-sm font-semibold text-muted-foreground">
            {user.username[0]?.toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold text-foreground">
            {user.fullName ?? user.username}
          </div>
          <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
        </div>

        {user.bio && <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{user.bio}</div>}
      </div>

      <div className="text-xs text-muted-foreground tabular-nums shrink-0">
        {user.followersCount} followers
      </div>
    </Link>
  );
}

function SearchPostItem({ locale, post }: { locale: string; post: SearchPostResult }) {
  return (
    <Link
      href={`/${locale}/status/${post.id}`}
      className="block rounded-xl border border-border p-3.5 hover:bg-accent/30 transition"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground hover:underline">
              {post.author.fullName}
            </span>
            <span className="text-xs text-muted-foreground">@{post.author.username}</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {new Date(post.createdAt).toLocaleDateString()}
        </div>
      </div>

      {post.content && (
        <p className="mt-2 text-sm whitespace-pre-wrap break-words text-foreground line-clamp-4">
          {post.content}
        </p>
      )}

      <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
        <span>{post.counts.replies} replies</span>
        <span>{post.counts.reposts} reposts</span>
        <span>{post.counts.likes} likes</span>
      </div>
    </Link>
  );
}
