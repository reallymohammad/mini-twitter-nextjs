// app/[locale]/(main)/status/[postId]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import PostCard from "@/components/post/PostCard";
import Composer from "@/components/post/Composer";

interface PageProps {
  params: Promise<{
    postId: string;
    locale: string;
  }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const { postId, locale } = await params;
  const currentUser = await getCurrentUser();

  // گرفتن جزئیات پست اصلی
  const post = await prisma.post.findUnique({
    where: { id: postId },
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
      likes: currentUser
        ? { where: { userId: currentUser.id }, select: { userId: true } }
        : false,
      pinnedBy: { select: { userId: true } },
      retweetOf: {
        include: {
          author: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  // گرفتن ریپلای‌های مربوط به این پست
  const replies = await prisma.post.findMany({
    where: {
      parentPostId: postId,
      type: "REPLY",
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
      likes: currentUser
        ? { where: { userId: currentUser.id }, select: { userId: true } }
        : false,
      pinnedBy: { select: { userId: true } },
      retweetOf: {
        include: {
          author: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-col min-h-screen border-r border-border max-w-2xl w-full">
      {/* هدر صفحه */}
      <div className="flex items-center gap-4 p-3 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      {/* نمایش خود پست اصلی */}
      <PostCard post={post as any} currentUserId={currentUser?.id} locale={locale} redirectAfterDelete fallbackHref={`/${locale}`} />

      {/* بخش ارسال پاسخ (Reply Composer) */}
      {currentUser && (
        <div className="border-b border-border p-3">
          <Composer
            type="REPLY"
            parentPostId={post.id}
            authorAvatarUrl={currentUser.avatarUrl || undefined}
            placeholder="Post your reply"
          />
        </div>
      )}

      {/* لیست ریپلای‌ها */}
      <div className="divide-y divide-border">
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
          <div className="text-center py-8 text-muted-foreground text-sm">
            No replies yet. Be the first to reply!
          </div>
        )}
      </div>
    </div>
  );
}
