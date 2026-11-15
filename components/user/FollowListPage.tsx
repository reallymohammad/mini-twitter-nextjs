import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import FollowListSearch, {
  type FollowListItem,
} from "@/components/user/FollowListSearch";

const CLIENT_LIMIT = 300;
const PAGE_SIZE = 20;

type Kind = "followers" | "following";

type Props = {
  kind: Kind;
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
  }>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function pageHref(path: string, query: string, page: number): string {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  params.set("page", String(page));

  return `${path}?${params.toString()}`;
}

export default async function FollowListPage({
  kind,
  params,
  searchParams,
}: Props) {
  const [{ locale, username }, sp, currentUser] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);

  const query = first(sp.q).trim().replace(/^@/, "").slice(0, 100);
  const requestedPage = Number(first(sp.page));
  const page =
    Number.isSafeInteger(requestedPage) &&
    requestedPage >= 1 &&
    requestedPage <= 10_000
      ? requestedPage
      : 1;

  const profileUser = await prisma.user.findFirst({
    where: { username, deletedAt: null },
    select: { id: true, username: true },
  });

  if (!profileUser) notFound();

  // فقط فالوهای تأییدشده و کاربران حذف‌نشده در شمارش لحاظ می‌شوند.
  const baseWhere: Prisma.FollowWhereInput =
    kind === "followers"
      ? {
          followingId: profileUser.id,
          status: "ACCEPTED",
          follower: { deletedAt: null },
        }
      : {
          followerId: profileUser.id,
          status: "ACCEPTED",
          following: { deletedAt: null },
        };

  const total = await prisma.follow.count({ where: baseWhere });
  const mode = total <= CLIENT_LIMIT ? "client" : "server";

  // Prisma contains در PostgreSQL از LIKE/ILIKE استفاده می‌کند؛
  // این سه کاراکتر را برای جست‌وجوی لفظی escape می‌کنیم.
  const literalQuery = query.replace(/[\\%_]/g, "\\$&");

  const searchWhere: Prisma.FollowWhereInput =
    mode === "server" && query
      ? kind === "followers"
        ? {
            OR: [
              {
                follower: {
                  username: {
                    contains: literalQuery,
                    mode: "insensitive",
                  },
                },
              },
              {
                follower: {
                  fullName: {
                    contains: literalQuery,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {
            OR: [
              {
                following: {
                  username: {
                    contains: literalQuery,
                    mode: "insensitive",
                  },
                },
              },
              {
                following: {
                  fullName: {
                    contains: literalQuery,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
      : {};

  const where: Prisma.FollowWhereInput = {
    AND: [baseWhere, searchWhere],
  };

  const userSelect = {
    id: true,
    username: true,
    fullName: true,
    avatarUrl: true,
    bio: true,
  } as const;

  // ترتیب پایدار است تا اعضایی با createdAt یکسان جابه‌جا نشوند.
  const queryOptions = {
    where,
    orderBy: [
      { createdAt: "desc" as const },
      { followerId: "desc" as const },
      { followingId: "desc" as const },
    ],
    ...(mode === "server"
      ? { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE + 1 }
      : {}),
  };

  type BasicUser = {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    bio: string | null;
  };

  let listedUsers: BasicUser[];
  let hasMore = false;

  if (kind === "followers") {
    const rows = await prisma.follow.findMany({
      ...queryOptions,
      select: { follower: { select: userSelect } },
    });

    hasMore = mode === "server" && rows.length > PAGE_SIZE;
    listedUsers = rows
      .slice(0, mode === "server" ? PAGE_SIZE : undefined)
      .map((row) => row.follower);
  } else {
    const rows = await prisma.follow.findMany({
      ...queryOptions,
      select: { following: { select: userSelect } },
    });

    hasMore = mode === "server" && rows.length > PAGE_SIZE;
    listedUsers = rows
      .slice(0, mode === "server" ? PAGE_SIZE : undefined)
      .map((row) => row.following);
  }

  const ids = listedUsers.map((user) => user.id);

  // اطلاعات لازم برای دکمهٔ Follow و برچسب Follows you؛ بدون N+1 query.
  const [viewerFollows, followersOfViewer] =
    currentUser && ids.length > 0
      ? await Promise.all([
          prisma.follow.findMany({
            where: {
              followerId: currentUser.id,
              followingId: { in: ids },
              status: "ACCEPTED",
            },
            select: { followingId: true },
          }),
          prisma.follow.findMany({
            where: {
              followerId: { in: ids },
              followingId: currentUser.id,
              status: "ACCEPTED",
            },
            select: { followerId: true },
          }),
        ])
      : [[], []];

  const followingIds = new Set(
    viewerFollows.map((follow) => follow.followingId)
  );
  const followsYouIds = new Set(
    followersOfViewer.map((follow) => follow.followerId)
  );

  const items: FollowListItem[] = listedUsers.map((user) => ({
    ...user,
    isFollowing: followingIds.has(user.id),
    followsYou: followsYouIds.has(user.id),
  }));

  const path = `/${locale}/${encodeURIComponent(profileUser.username)}/${kind}`;

  return (
    <div className="mx-auto min-h-screen max-w-2xl border-x border-border">
      <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <Link
          href={`/${locale}/${encodeURIComponent(profileUser.username)}`}
          aria-label="بازگشت به پروفایل"
          className="-ms-2 rounded-full p-2 transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>

        <div>
          <h1 className="text-xl font-bold">
            {kind === "followers" ? "Followers" : "Following"}
          </h1>
          <p className="text-xs text-muted-foreground">
            @{profileUser.username}
          </p>
        </div>
      </div>

      <FollowListSearch
        items={items}
        mode={mode}
        initialQuery={query}
        locale={locale}
        profileUsername={profileUser.username}
        kind={kind}
        currentUserId={currentUser?.id}
      />

      {mode === "server" && (page > 1 || hasMore) && (
        <nav
          aria-label="صفحه‌بندی لیست"
          className="flex items-center justify-between border-t border-border p-4 text-sm"
        >
          {page > 1 ? (
            <Link
              href={pageHref(path, query, page - 1)}
              className="rounded-lg border border-border px-4 py-2 hover:bg-muted"
            >
              قبلی
            </Link>
          ) : (
            <span />
          )}

          <span className="text-muted-foreground">صفحه {page}</span>

          {hasMore ? (
            <Link
              href={pageHref(path, query, page + 1)}
              className="rounded-lg border border-border px-4 py-2 hover:bg-muted"
            >
              بعدی
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
