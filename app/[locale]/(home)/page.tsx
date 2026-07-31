import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
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

  const posts = (await prisma.post.findMany({
    where: { type: { in: ["POST", "RETWEET", "QUOTE"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      ...postInclude,
      likes: currentUser ? { where: { userId: currentUser.id } } : false,
    },
  })) as PostWithRelations[];

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto border-x border-border">
        <Composer authorAvatarUrl={currentUser?.avatarUrl ?? undefined} />
        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">No posts yet.</p>
        ) : (
          posts.map((p) => (
            <PostCard key={p.id} post={p} currentUserId={currentUser?.id} locale={locale} />
          ))
        )}
      </div>
    </main>
  );
}
