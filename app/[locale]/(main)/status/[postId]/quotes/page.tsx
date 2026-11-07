import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import PostCard from "@/components/post/PostCard";
import { PostWithRelations } from "@/lib/types/post";

interface QuotesPageProps {
  params: Promise<{
    postId: string;
    locale: string;
  }>;
}

export default async function QuotesPage({ params }: QuotesPageProps) {
  const { postId, locale } = await params;
  const currentUser = await getCurrentUser();

  const originalPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!originalPost) notFound();

  const userFilter = currentUser?.id
    ? { where: { userId: currentUser.id }, select: { userId: true } }
    : false;

  const quotes = await prisma.post.findMany({
    where: {
      quoteOfId: postId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          badge: true,
        },
      },
      likes: userFilter,
      bookmarks: userFilter,
      reposts: userFilter,
      pinnedBy: { select: { userId: true } },
      quoteOf: {
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
              badge: true,
            },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
          reposts: true,
          quotes: true,
        },
      },
    },
  });

  return (
    <div className="flex min-h-screen w-full max-w-2xl flex-col border-r border-border">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <Link
          href={`/${locale}/status/${postId}`}
          className="rounded-full p-2 transition hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold leading-5">Quote Posts</h1>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {quotes.length > 0 ? (
          quotes.map((quotePost) => (
            <PostCard
              key={quotePost.id}
              post={quotePost as unknown as PostWithRelations}
              currentUserId={currentUser?.id}
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
