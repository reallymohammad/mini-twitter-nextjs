import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import PostCard from "@/components/post/PostCard";
import {
  getPostInclude,
  getVisiblePostWhere,
  sanitizePostRelations,
} from "@/lib/prisma/postInclude";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { PostWithRelations } from "@/lib/types/post";

interface QuotesPageProps {
  params: Promise<{
    postId: string;
    locale: string;
  }>;
}

export default async function QuotesPage({ params }: QuotesPageProps) {
  const { postId, locale } = await params;
  const currentUser = await getCurrentUser();
  const viewerId = currentUser?.id;

  // برای نمایش فهرست کوت‌ها، پست اصلی نباید صرفاً به این دلیل که
  // بیننده نویسنده‌اش را بلاک کرده از نتیجه حذف شود.
  const visibleOriginalPostWhere = getVisiblePostWhere(viewerId, {
    includeBlockedByViewer: true,
  });

  const originalPost = await prisma.post.findFirst({
    where: {
      AND: [visibleOriginalPostWhere, { id: postId }],
    },
    select: { id: true },
  });

  if (!originalPost) {
    notFound();
  }

  // این شرط عمداً مستقل است: خود نویسندگان کوت‌ها اگر یکی از دو طرف
  // بلاک داشته باشند، در فهرست کوت‌ها نمایش داده نمی‌شوند.
  const visibleQuoteAuthorWhere = viewerId
    ? {
        blockedBy: {
          none: { blockerId: viewerId },
        },
        blocking: {
          none: { blockedId: viewerId },
        },
      }
    : {};

  const quotes = await prisma.post.findMany({
    where: {
      AND: [
        // پست کوت‌شده باید خودش برای بیننده قابل‌مشاهده باشد.
        // چون این پست متعلق به نویسندهٔ کوت است، بلاک‌شدن آن نویسنده
        // توسط بیننده همچنان باعث فیلترشدن کوت می‌شود.
        getVisiblePostWhere(viewerId),

        { quoteOfId: postId },

        // فیلتر صریح نویسندهٔ کوت از هر دو سمت بلاک.
        {
          author: {
            is: visibleQuoteAuthorWhere,
          },
        },

        // پست اصلیِ کوت‌شده: بلاکِ بیننده نباید آن را از کوئری حذف کند.
        {
          quoteOf: {
            is: visibleOriginalPostWhere,
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      ...getPostInclude(viewerId),
      bookmarks: viewerId
        ? {
            where: { userId: viewerId },
            select: { userId: true },
          }
        : false,
    },
  });

  const visibleQuotes = quotes.map((quote) =>
    sanitizePostRelations(quote, viewerId)
  );

  return (
    <div className="flex min-h-screen w-full max-w-2xl flex-col border-r border-border">
      <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <Link
          href={`/${locale}/status/${postId}`}
          aria-label="Back to post"
          className="rounded-full p-2 transition hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>

        <h1 className="text-xl font-bold leading-5">Quote Posts</h1>
      </div>

      <div className="divide-y divide-border">
        {visibleQuotes.length > 0 ? (
          visibleQuotes.map((quotePost) => (
            <PostCard
              key={quotePost.id}
              post={quotePost as unknown as PostWithRelations}
              currentUserId={viewerId}
              locale={locale}
            />
          ))
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No quote posts yet.
          </div>
        )}
      </div>
    </div>
  );
}
