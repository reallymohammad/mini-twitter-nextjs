import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { normalizeQuery, toWebSearchParam } from "./postgres";

const PAGE_SIZE = 20;
const USERS_PAGE_SIZE = 20;

// ---------- Types ----------

export type Badge = "NONE" | "BLUE" | "GOLD" | "GREY" | "DEVELOPER";

export type SearchPostAuthor = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  badge: Badge;
  isFollowedByViewer: boolean;
};

export type SearchPostQuoteOf = {
  id: string;
  content: string | null;
  createdAt: Date;
  author: {
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
} | null;

export type SearchPostResult = {
  id: string;
  content: string | null;
  mediaUrls: string[];
  createdAt: Date;
  type: "POST" | "REPLY" | "QUOTE";
  replyToId: string | null;
  replyToUsername: string | null;
  author: SearchPostAuthor;
  quoteOf: SearchPostQuoteOf;
  counts: {
    likes: number;
    reposts: number;
    replies: number;
    bookmarks: number;
  };
  viewer: {
    isLiked: boolean;
    isReposted: boolean;
    isBookmarked: boolean;
  };
  rank?: number;
};

export type LatestCursor = { createdAt: string; id: string } | null;
export type TopCursor = { rank: number; id: string } | null;

// ---------- Raw row shape returned by SQL ----------

type RawPostRow = {
  id: string;
  content: string | null;
  mediaUrls: string[];
  createdAt: Date;
  type: "POST" | "REPLY" | "QUOTE";
  replyToId: string | null;
  replyToUsername: string | null;
  authorId: string;
  authorUsername: string;
  authorFullName: string;
  authorAvatarUrl: string | null;
  authorBadge: Badge;
  isFollowedByViewer: boolean;
  quoteId: string | null;
  quoteContent: string | null;
  quoteCreatedAt: Date | null;
  quoteAuthorUsername: string | null;
  quoteAuthorFullName: string | null;
  quoteAuthorAvatarUrl: string | null;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  bookmarkCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  rank?: number;
};

function mapRow(row: RawPostRow): SearchPostResult {
  return {
    id: row.id,
    content: row.content,
    mediaUrls: row.mediaUrls ?? [],
    createdAt: row.createdAt,
    type: row.type,
    replyToId: row.replyToId,
    replyToUsername: row.replyToUsername,
    author: {
      id: row.authorId,
      username: row.authorUsername,
      fullName: row.authorFullName,
      avatarUrl: row.authorAvatarUrl,
      badge: row.authorBadge,
      isFollowedByViewer: row.isFollowedByViewer,
    },
    quoteOf: row.quoteId
      ? {
          id: row.quoteId,
          content: row.quoteContent,
          createdAt: row.quoteCreatedAt!,
          author: {
            username: row.quoteAuthorUsername!,
            fullName: row.quoteAuthorFullName!,
            avatarUrl: row.quoteAuthorAvatarUrl,
          },
        }
      : null,
    counts: {
      likes: Number(row.likeCount),
      reposts: Number(row.repostCount),
      replies: Number(row.replyCount),
      bookmarks: Number(row.bookmarkCount),
    },
    viewer: {
      isLiked: row.isLiked,
      isReposted: row.isReposted,
      isBookmarked: row.isBookmarked,
    },
    ...(row.rank !== undefined ? { rank: row.rank } : {}),
  };
}

// ---------- Shared SQL fragments ----------

function quoteJoins() {
  return Prisma.sql`
    LEFT JOIN public."Post" rt_post ON rt_post.id = p."replyToId"
    LEFT JOIN public."User" rt      ON rt.id = rt_post."authorId"
    LEFT JOIN public."Post" qp      ON qp.id = p."quoteOfId" AND qp."deletedAt" IS NULL
    LEFT JOIN public."User" qa      ON qa.id = qp."authorId"
  `;
}

function denormalizedCounts() {
  return Prisma.sql`
    p."likeCount"::int     AS "likeCount",
    p."repostCount"::int   AS "repostCount",
    p."replyCount"::int    AS "replyCount",
    p."bookmarkCount"::int AS "bookmarkCount"
  `;
}

function viewerFlags(viewerId: string | null) {
  if (!viewerId) {
    return Prisma.sql`
      false AS "isLiked",
      false AS "isReposted",
      false AS "isBookmarked"
    `;
  }
  return Prisma.sql`
    EXISTS (
      SELECT 1 FROM public."Like" l
      WHERE l."postId" = p.id AND l."userId" = ${viewerId}
    ) AS "isLiked",
    EXISTS (
      SELECT 1 FROM public."Repost" rp
      WHERE rp."postId" = p.id AND rp."userId" = ${viewerId}
    ) AS "isReposted",
    EXISTS (
      SELECT 1 FROM public."Bookmark" bm
      WHERE bm."postId" = p.id AND bm."userId" = ${viewerId}
    ) AS "isBookmarked"
  `;
}

function isFollowedByViewerExpr(viewerId: string | null) {
  if (!viewerId) return Prisma.sql`false`;
  return Prisma.sql`
    EXISTS (
      SELECT 1 FROM public."Follow" f
      WHERE f."followerId" = ${viewerId}
        AND f."followingId" = a.id
        AND f.status = 'ACCEPTED'
    )
  `;
}

function commonPostSelect(viewerId: string | null) {
  return Prisma.sql`
    p.id,
    p.content,
    p."mediaUrls"   AS "mediaUrls",
    p."createdAt"   AS "createdAt",
    CASE
      WHEN p."quoteOfId"  IS NOT NULL THEN 'QUOTE'
      WHEN p."replyToId"  IS NOT NULL THEN 'REPLY'
      ELSE 'POST'
    END::text        AS type,
    p."replyToId"   AS "replyToId",
    rt.username      AS "replyToUsername",
    a.id             AS "authorId",
    a.username       AS "authorUsername",
    a."fullName"     AS "authorFullName",
    a."avatarUrl"    AS "authorAvatarUrl",
    a.badge          AS "authorBadge",
    ${isFollowedByViewerExpr(viewerId)} AS "isFollowedByViewer",
    qp.id            AS "quoteId",
    qp.content       AS "quoteContent",
    qp."createdAt"   AS "quoteCreatedAt",
    qa.username      AS "quoteAuthorUsername",
    qa."fullName"    AS "quoteAuthorFullName",
    qa."avatarUrl"   AS "quoteAuthorAvatarUrl",
    ${denormalizedCounts()},
    ${viewerFlags(viewerId)}
  `;
}

// ---------- Latest tab: cursor on (createdAt, id) ----------

export async function searchPostsLatest(params: {
  query: string;
  viewerId: string | null;
  cursor?: LatestCursor;
  limit?: number;
}): Promise<{ items: SearchPostResult[]; nextCursor: LatestCursor }> {
  const { query, viewerId, cursor = null, limit = PAGE_SIZE } = params;
const q = normalizeQuery(query);

  if (!q) {
    return { items: [], nextCursor: null };
  }

  const cursorCondition = cursor
    ? Prisma.sql`AND (p."createdAt", p.id) < (${cursor.createdAt}::timestamptz, ${cursor.id})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<RawPostRow[]>`
    SELECT
      ${commonPostSelect(viewerId)}
    FROM public."Post" p
    JOIN  public."User" a ON a.id = p."authorId"
    ${quoteJoins()}
    WHERE p."deletedAt" IS NULL
      AND a."deletedAt" IS NULL
      AND p."searchVector" @@ websearch_to_tsquery('public.y_search'::regconfig, ${q})
      ${cursorCondition}
    ORDER BY p."createdAt" DESC, p.id DESC
    LIMIT ${limit + 1}
  `;

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map(mapRow),
    nextCursor:
      hasMore && last
        ? { createdAt: last.createdAt.toISOString(), id: last.id }
        : null,
  };
}

// ---------- Top tab: cursor on (rank, id) using ts_rank ----------

export async function searchPostsTop(params: {
  query: string;
  viewerId: string | null;
  cursor?: TopCursor;
  limit?: number;
}): Promise<{ items: SearchPostResult[]; nextCursor: TopCursor }> {
  const { query, viewerId, cursor = null, limit = PAGE_SIZE } = params;
const q = normalizeQuery(query);

  if (!q) {
    return { items: [], nextCursor: null };
  }

  const cursorCondition = cursor
    ? Prisma.sql`AND (sub.rank, sub.id) < (${cursor.rank}::real, ${cursor.id})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<RawPostRow[]>`
    SELECT sub.*
    FROM (
      SELECT
        ${commonPostSelect(viewerId)},
        ts_rank(p."searchVector", websearch_to_tsquery('public.y_search'::regconfig, ${q})) AS rank
      FROM public."Post" p
      JOIN  public."User" a ON a.id = p."authorId"
      ${quoteJoins()}
      WHERE p."deletedAt" IS NULL
        AND a."deletedAt" IS NULL
        AND p."searchVector" @@ websearch_to_tsquery('public.y_search'::regconfig, ${q})
    ) sub
    WHERE true ${cursorCondition}
    ORDER BY sub.rank DESC, sub.id DESC
    LIMIT ${limit + 1}
  `;

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map(mapRow),
    nextCursor:
      hasMore && last ? { rank: Number(last.rank), id: last.id } : null,
  };
}

// ---------- Users tab: offset/limit + trigram similarity ----------

export type SearchUserResult = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  badge: Badge;
  bio: string | null;
  followersCount: number;
  isFollowedByViewer: boolean;
  similarity: number;
};

type RawUserRow = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  badge: Badge;
  bio: string | null;
  followersCount: number;
  isFollowedByViewer: boolean;
  similarity: number;
};

export async function searchUsers(params: {
  query: string;
  viewerId: string | null;
  offset?: number;
  limit?: number;
}): Promise<{ items: SearchUserResult[]; hasMore: boolean }> {
  const { query, viewerId, offset = 0, limit = USERS_PAGE_SIZE } = params;
  const q = normalizeQuery(query).replace(/^@/, "").toLowerCase();

  if (!q) {
    return { items: [], hasMore: false };
  }

  const rows = await prisma.$queryRaw<RawUserRow[]>`
    SELECT
      u.id,
      u.username,
      u."fullName"        AS "fullName",
      u."avatarUrl"       AS "avatarUrl",
      u.badge,
      u.bio,
      u."followersCount"  AS "followersCount",
      ${
        viewerId
          ? Prisma.sql`
              EXISTS (
                SELECT 1 FROM public."Follow" f
                WHERE f."followerId" = ${viewerId}
                  AND f."followingId" = u.id
                  AND f.status = 'ACCEPTED'
              )`
          : Prisma.sql`false`
      } AS "isFollowedByViewer",
      GREATEST(
        similarity(lower(u.username), ${q}),
        similarity(lower(COALESCE(u."fullName", '')), ${q})
      )::float8 AS similarity
    FROM public."User" u
    WHERE u."deletedAt" IS NULL
      AND (
        lower(u.username) ILIKE '%' || ${q} || '%'
        OR lower(u."fullName") ILIKE '%' || ${q} || '%'
        OR similarity(lower(u.username), ${q}) > 0.2
        OR similarity(lower(COALESCE(u."fullName", '')), ${q}) > 0.2
      )
    ORDER BY similarity DESC, u."followersCount" DESC
    OFFSET ${offset}
    LIMIT ${limit + 1}
  `;

  const hasMore = rows.length > limit;
  return { items: rows.slice(0, limit), hasMore };
}
