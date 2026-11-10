// app/[locale]/(main)/status/[postId]/page.tsx
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import PostCard from "@/components/post/PostCard";
import Composer from "@/components/post/Composer";
import DeletedPostPlaceholder from "@/components/post/DeletedPostPlaceholder";
import BackButton from "@/components/post/BackButton";

interface PageProps {
  params: Promise<{
    postId: string;
    locale: string;
  }>;
}

const MAX_VISIBLE_ANCESTORS = 4;

const authorSelect = {
  id: true,
  fullName: true,
  username: true,
  avatarUrl: true,
  badge: true,
} as const;

export default async function PostDetailPage({ params }: PageProps) {
  const { postId, locale } = await params;
  setRequestLocale(locale);

  const currentUser = await getCurrentUser();

  const fallbackHref = currentUser
    ? `/${locale}/${currentUser.username}`
    : `/${locale}`;

  const userFilter = currentUser
    ? ({
        where: { userId: currentUser.id },
        select: { userId: true },
      } as const)
    : false;

  const postInclude = {
    author: { select: authorSelect },
    likes: userFilter,
    bookmarks: userFilter,
    reposts: userFilter,
    pinnedBy: { select: { userId: true } },
    replyTo: {
      select: {
        id: true,
        deletedAt: true,
        replyToId: true,
        author: { select: authorSelect },
      },
    },
    quoteOf: {
      include: {
        author: { select: authorSelect },
      },
    },
    _count: {
      select: {
        likes: true,
        replies: { where: { deletedAt: null } },
        reposts: true,
        quotes: { where: { deletedAt: null } },
      },
    },
  } as const satisfies Prisma.PostInclude;

  // ۱. دریافت پست اصلی
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: postInclude,
  });

  const header = (
    <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-border bg-background/80 p-3 backdrop-blur-md">
      <BackButton fallbackHref={fallbackHref} />
      <h1 className="text-xl font-bold">Post</h1>
    </div>
  );

  if (!post) {
    return (
      <div className="flex min-h-screen w-full max-w-2xl flex-col border-r border-border">
        {header}
        <div className="p-4">
          <DeletedPostPlaceholder className="justify-center py-6" />
        </div>
      </div>
    );
  }

  // ۲. واکشی هم‌زمان ریپلای‌ها و پیمایش والدها به شکل امن
  const repliesPromise = prisma.post.findMany({
    where: {
      replyToId: post.id,
      deletedAt: null,
    },
    include: postInclude,
    orderBy: { createdAt: "desc" },
  });

  // جمع‌آوری امن اجداد (Ancestors)
  type LoadedPost = NonNullable<typeof post>;
  const ancestors: Array<{ id: string; post: LoadedPost | null }> = [];
  const visitedIds = new Set<string>([post.id]);

  let currentTargetReplyId: string | null = post.replyToId;

  while (currentTargetReplyId && ancestors.length < MAX_VISIBLE_ANCESTORS) {
    if (visitedIds.has(currentTargetReplyId)) break;
    visitedIds.add(currentTargetReplyId);

    const ancestorPost = await prisma.post.findUnique({
      where: { id: currentTargetReplyId },
      include: postInclude,
    });

    ancestors.push({
      id: currentTargetReplyId,
      post: ancestorPost,
    });

    currentTargetReplyId = ancestorPost?.replyToId ?? null;
  }

  const earlierAncestorId = currentTargetReplyId;
  ancestors.reverse();

  const replies = await repliesPromise;

  const repostsCount = post.repostCount || post._count.reposts;
  const quotesCount = post.quoteCount || post._count.quotes;
  const likesCount = post.likeCount || post._count.likes;
  const bookmarksCount = post.bookmarkCount;

  const hasMetrics =
    repostsCount > 0 ||
    quotesCount > 0 ||
    likesCount > 0 ||
    bookmarksCount > 0;

  const immediateParent = ancestors[ancestors.length - 1];
  const parentUnavailable = Boolean(
    post.replyToId &&
      (!immediateParent ||
        !immediateParent.post ||
        immediateParent.post.deletedAt !== null)
  );

  return (
    <div className="flex min-h-screen w-full max-w-2xl flex-col border-r border-border">
      {header}

      {earlierAncestorId && (
        <Link
          href={`/${locale}/status/${earlierAncestorId}`}
          className="border-b border-border px-4 py-3 text-sm text-indigo-500 hover:bg-accent/40 hover:underline"
        >
          View earlier posts
        </Link>
      )}

      {ancestors.map((ancestor, index) =>
        ancestor.post && ancestor.post.deletedAt === null ? (
          <PostCard
            key={ancestor.id}
            post={ancestor.post as any}
            currentUserId={currentUser?.id}
            locale={locale}
            hideReplyContext
            connectAbove={index > 0}
            dashedAbove={
              index > 0 &&
              (!ancestors[index - 1].post ||
                ancestors[index - 1].post?.deletedAt !== null)
            }
            connectBelow
          />
        ) : (
          <DeletedPostPlaceholder
            key={ancestor.id}
            inThread
            connectAbove={index > 0}
            connectBelow
          />
        )
      )}

      {post.deletedAt === null ? (
        <>
          <PostCard
            post={post as any}
            currentUserId={currentUser?.id}
            locale={locale}
            hideReplyContext
            connectAbove={ancestors.length > 0}
            dashedAbove={parentUnavailable}
            focused
            redirectAfterDelete
            fallbackHref={fallbackHref}
          />

          {hasMetrics && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-4 py-3 text-sm text-muted-foreground">
              {repostsCount > 0 && (
                <Link
                  href={`/${locale}/status/${post.id}/reposts`}
                  className="hover:underline"
                >
                  <span className="font-bold tabular-nums text-foreground">
                    {repostsCount}
                  </span>{" "}
                  Reposts
                </Link>
              )}

              {quotesCount > 0 && (
                <Link
                  href={`/${locale}/status/${post.id}/quotes`}
                  className="hover:underline"
                >
                  <span className="font-bold tabular-nums text-foreground">
                    {quotesCount}
                  </span>{" "}
                  Quotes
                </Link>
              )}

              {likesCount > 0 && (
                <Link
                  href={`/${locale}/status/${post.id}/likes`}
                  className="hover:underline"
                >
                  <span className="font-bold tabular-nums text-foreground">
                    {likesCount}
                  </span>{" "}
                  Likes
                </Link>
              )}

              {bookmarksCount > 0 && (
                <div>
                  <span className="font-bold tabular-nums text-foreground">
                    {bookmarksCount}
                  </span>{" "}
                  Bookmarks
                </div>
              )}
            </div>
          )}

          {currentUser && (
            <div className="border-b border-border p-3">
              <Composer
                currentUser={{
                  id: currentUser.id,
                  username: currentUser.username,
                  name: currentUser.fullName ?? null,
                  avatarUrl: currentUser.avatarUrl ?? null,
                }}
                replyToId={post.id}
                placeholder="Post your reply"
              />
            </div>
          )}
        </>
      ) : (
        <DeletedPostPlaceholder
          inThread
          connectAbove={ancestors.length > 0}
          className="bg-accent/15"
        />
      )}

      <div>
        {replies.length > 0 ? (
          replies.map((reply) => (
            <PostCard
              key={reply.id}
              post={reply as any}
              currentUserId={currentUser?.id}
              locale={locale}
            />
          ))
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No replies yet. Be the first to reply!
          </div>
        )}
      </div>
    </div>
  );
}
