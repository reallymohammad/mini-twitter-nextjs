// app/[locale]/(main)/home/page.tsx
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Composer from "@/components/post/Composer";
import InfinitePostList from "@/components/post/InfinitePostList";
import { getPostInclude, getRetweetedByCurrentUser } from "@/lib/prisma/postInclude";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const currentUser = await getCurrentUser();

  const limit = 10;

  const initialPosts = await prisma.post.findMany({
    take: limit + 1,
    where: { parentPostId: null },
    orderBy: { createdAt: "desc" },
    include: getPostInclude(currentUser?.id),
  });

  let initialCursor: string | null = null;
  const posts = [...initialPosts];

  if (posts.length > limit) {
    const nextItem = posts.pop();
    initialCursor = nextItem?.id || null;
  }

  const retweetedByUser = currentUser
    ? getRetweetedByCurrentUser(posts, currentUser.id)
    : new Set<string>();

  return (
    <div className="flex-1 max-w-2xl border-r border-border min-h-screen">
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border p-4">
        <h1 className="text-xl font-bold">Home</h1>
      </div>

      {currentUser && (
        <div className="p-4 border-b border-border">
          <Composer
            authorAvatarUrl={currentUser.avatarUrl || undefined}
            locale={locale}
          />
        </div>
      )}

      <InfinitePostList
        initialPosts={posts as any}
        initialCursor={initialCursor}
        currentUserId={currentUser?.id}
        locale={locale}
        initialRetweetedByUser={retweetedByUser}
      />
    </div>
  );
}
