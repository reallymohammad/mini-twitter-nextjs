// app/[locale]/bookmarks/page.tsx
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import PostCard from "@/components/post/PostCard";

export default async function BookmarksPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const locale = await getLocale();

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      post: {
        include: {
          author: true,
           pinnedBy: {
      select: { userId: true },
    },
          _count: { select: { likes: true, replies: true, reposts: true } },
          likes: {
            where: { userId: currentUser.id },
            select: { userId: true },
          },
          reposts: {
            where: { userId: currentUser.id },
            select: { userId: true },
          },
        },
      },
    },
  });

  const posts = bookmarks
    .filter((b) => b.post && !b.post.deletedAt)
    .map((b) => ({
      ...b.post,
      isLiked: b.post.likes.length > 0,
      isReposted: b.post.reposts.length > 0,
      isBookmarked: true,
    }));

  return (
    <div>
      <h1 className="p-4 text-lg font-bold border-b border-neutral-200 dark:border-neutral-800">
        Bookmarks
      </h1>
      {posts.length === 0 ? (
        <p className="text-center text-neutral-400 py-16 text-sm">
          هنوز چیزی بوکمارک نکردی.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUser.id}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
