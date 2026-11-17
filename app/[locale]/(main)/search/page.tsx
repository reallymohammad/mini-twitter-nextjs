// app/[locale]/(main)/search/page.tsx
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  searchPostsTop,
  searchPostsLatest,
  searchUsers,
  type SearchPostResult,
  type SearchUserResult,
} from "@/lib/search/query";
import { SearchTabs } from "@/components/search/SearchTabs"; // مسیر SearchTabs در صورتی که در همین پوشه است
import PostCard from "@/components/post/PostCard"; // مسیر متداول کامپوننت PostCard
import FollowButton from "@/components/user/FollowButton";
import { PostWithRelations } from "@/lib/types/post";

type Tab = "top" | "latest" | "people";

function getTab(v: unknown): Tab {
  return v === "latest" || v === "people" || v === "top" ? v : "top";
}

function buildHref(locale: string, q: string, tab: Tab, extra?: Record<string, string>) {
  const sp = new URLSearchParams();
  sp.set("q", q);
  sp.set("tab", tab);
  if (extra) {
    for (const [k, val] of Object.entries(extra)) {
      sp.set(k, val);
    }
  }
  return `/${locale}/search?${sp.toString()}`;
}

/**
 * تبدیل دیتای بهینه‌شده جستجوی خام SQL به اینترفیس استاندارد PostWithRelations
 */
function toPostWithRelations(post: SearchPostResult, currentUserId?: string): PostWithRelations {
  return {
    id: post.id,
    content: post.content,
    mediaUrls: post.mediaUrls ?? [],
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.createdAt),
    deletedAt: null,
    authorId: post.author.id,
    replyToId: post.replyToId,
    quoteOfId: post.quoteOf?.id ?? null,
    author: {
      id: post.author.id,
      username: post.author.username,
      fullName: post.author.fullName,
      avatarUrl: post.author.avatarUrl,
      badge: post.author.badge,
      isPrivate: false, // پست‌هایی که بازگردانده شده‌اند یا عمومی‌اند یا ویوور فالوور آن‌هاست
    },
    // حفظ ساختار ریپلای برای پیش‌نمایش در صورت وجود
    replyTo: post.replyToUsername
      ? ({
          id: post.replyToId!,
          author: {
            username: post.replyToUsername,
          },
        } as any)
      : null,
    // حفظ ساختار کوت
    quoteOf: post.quoteOf
      ? ({
          id: post.quoteOf.id,
          content: post.quoteOf.content,
          createdAt: new Date(post.quoteOf.createdAt),
          mediaUrls: [],
          author: {
            username: post.quoteOf.author.username,
            fullName: post.quoteOf.author.fullName,
            avatarUrl: post.quoteOf.author.avatarUrl,
            badge: "NONE",
            isPrivate: false,
          },
        } as any)
      : null,
    _count: {
      likes: post.counts.likes,
      reposts: post.counts.reposts,
      replies: post.counts.replies,
      bookmarks: post.counts.bookmarks,
      quotes: 0,
    },
    likes: post.viewer.isLiked && currentUserId ? [{ userId: currentUserId }] : [],
    reposts: post.viewer.isReposted && currentUserId ? [{ userId: currentUserId }] : [],
    bookmarks: post.viewer.isBookmarked && currentUserId ? [{ userId: currentUserId }] : [],
    pinnedBy: [],
  } as unknown as PostWithRelations;
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
      searchUsers({ query: q, viewerId, limit: 5, offset: 0 }),
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

  return (
    <div className="min-h-screen border-x border-border pb-10">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="px-4 py-3">
          <div className="text-xs text-muted-foreground">Search results for</div>
          <h1 className="text-lg font-bold text-foreground truncate">&ldquo;{q}&rdquo;</h1>
        </div>

        {/* Tab Bar - هماهنگ با تب‌های مدرن توییتر */}
        <SearchTabs locale={locale} query={q} />
      </div>

      {/* Main Content Area */}
      <div>
        {tab === "top" && (
          <div>
            {/* بلوک پیشنهادی افراد شبیه به سایدبار/بالای سرچ توییتر */}
            {users.length > 0 && (
              <section className="border-b border-border">
                <div className="px-4 py-3">
                  <h2 className="text-base font-bold text-foreground">People</h2>
                </div>
                <div className="divide-y divide-border">
                  {users.map((u) => (
                    <UserRow
                      key={u.id}
                      locale={locale}
                      user={u}
                      currentUserId={viewerId ?? undefined}
                    />
                  ))}
                </div>
                {usersHasMore && (
                  <Link
                    href={buildHref(locale, q, "people")}
                    className="block px-4 py-3 text-sm font-medium text-primary hover:bg-accent/40 transition"
                  >
                    View all people
                  </Link>
                )}
              </section>
            )}

            {/* لیست پست‌ها با PostCard */}
            <section>
              {posts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No posts found matching &ldquo;{q}&rdquo;
                </div>
              ) : (
                <div>
                  {posts.map((p) => (
                    <PostCard
                      key={p.id}
                      post={toPostWithRelations(p, viewerId ?? undefined)}
                      currentUserId={viewerId ?? undefined}
                      locale={locale}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "latest" && (
          <section>
            {posts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No recent posts found matching &ldquo;{q}&rdquo;
              </div>
            ) : (
              <div>
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={toPostWithRelations(p, viewerId ?? undefined)}
                    currentUserId={viewerId ?? undefined}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "people" && (
          <section>
            {users.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No users found matching &ldquo;{q}&rdquo;
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    locale={locale}
                    user={u}
                    currentUserId={viewerId ?? undefined}
                  />
                ))}
              </div>
            )}

            {/* صفحه‌بندی افراد */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <Link
                aria-disabled={page <= 1}
                className={[
                  "text-sm font-medium px-4 py-2 rounded-full border border-border transition",
                  page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-accent",
                ].join(" ")}
                href={buildHref(locale, q, "people", { page: String(page - 1) })}
              >
                Previous
              </Link>

              <span className="text-xs text-muted-foreground">Page {page}</span>

              <Link
                aria-disabled={!usersHasMore}
                className={[
                  "text-sm font-medium px-4 py-2 rounded-full border border-border transition",
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

/**
 * ردیف کاربری در استایل استاندارد توییتر
 */
function UserRow({
  locale,
  user,
  currentUserId,
}: {
  locale: string;
  user: SearchUserResult;
  currentUserId?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-accent/40 transition">
      <Link href={`/${locale}/${user.username}`} className="flex gap-3 min-w-0 flex-1">
        <div className="size-10 shrink-0 rounded-full bg-muted overflow-hidden">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.username}
              width={40}
              height={40}
              className="size-10 object-cover"
            />
          ) : (
            <div className="flex size-10 items-center justify-center font-bold text-muted-foreground">
              {user.username[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-bold text-foreground hover:underline">
              {user.fullName ?? user.username}
            </span>
            <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
          </div>

          {user.bio && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground break-words">
              {user.bio}
            </p>
          )}

          <div className="mt-1 text-xs text-muted-foreground tabular-nums">
            {user.followersCount.toLocaleString()} followers
          </div>
        </div>
      </Link>

      {/* اگر کامپوننت FollowButton در پروژه فعال است */}
      {currentUserId && currentUserId !== user.id && (
        <div className="shrink-0 pt-0.5">
          <FollowButton
            targetUserId={user.id}
            initialIsFollowing={user.isFollowedByViewer}
          />
        </div>
      )}
    </div>
  );
}
