import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Composer from "@/components/post/Composer";
import PostCard from "@/components/post/PostCard";
import { PostWithRelations } from "@/lib/types/post";

const postInclude = {
  author: { select: { id: true, username: true, fullName: true, avatarUrl: true, badge: true } },
  _count: { select: { likes: true, replies: true, retweets: true } },
  retweetOf: {
    include: {
      author: { select: { id: true, username: true, fullName: true, avatarUrl: true, badge: true } },
      _count: { select: { likes: true, replies: true, retweets: true } },
    },
  },
} as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");

  // Get IDs of users the current user follows
  const following = await prisma.follow.findMany({
    where: { followerId: currentUser.id },
    select: { followingId: true },
  });

  const authorIds = [currentUser.id, ...following.map((f) => f.followingId)];

  // Fetch posts from current user and their followings, excluding REPLY type
  const posts = (await prisma.post.findMany({
    where: {
      authorId: { in: authorIds },
      type: { in: ["POST", "RETWEET", "QUOTE"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      ...postInclude,
      likes: { where: { userId: currentUser.id } },
      retweets: { where: { authorId: currentUser.id, type: "RETWEET" } },
    },
  })) as PostWithRelations[];

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto border-x border-border">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
          <h1 className="font-bold text-xl">Home</h1>
        </header>

        {/* Composer */}
        <div className="border-b border-border">
          <Composer authorAvatarUrl={currentUser.avatarUrl ?? undefined} />
        </div>

        {/* Feed */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground">
            <p className="font-semibold text-lg">Nothing here yet</p>
            <p className="text-sm">Follow people to see their posts.</p>
          </div>
        ) : (
          posts.map((p) => (
            <PostCard key={p.id} post={p} currentUserId={currentUser.id} locale={locale} />
          ))
        )}
      </div>
    </main>
  );
}
