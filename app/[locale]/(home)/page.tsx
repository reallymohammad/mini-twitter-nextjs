import { getCurrentUser } from "@/lib/auth";
import { getHomeFeed } from "@/lib/queries/feed";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import Composer from "@/components/post/Composer";
import PostCard from "@/components/shared/posts/PostCard";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const locale = await getLocale();
  const posts = await getHomeFeed(user.id);

  return (
    <div className="min-h-screen max-w-[600px] mx-auto border-x border-border">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <h1 className="font-bold text-xl">Home</h1>
      </header>

      {/* Composer */}
      <div className="border-b border-border">
        <Composer
          authorId={user.id}
          avatarUrl={user.avatarUrl ?? undefined}
        />
      </div>

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <p className="font-semibold text-lg">Nothing here yet</p>
          <p className="text-sm">Follow people to see their posts.</p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user.id}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
