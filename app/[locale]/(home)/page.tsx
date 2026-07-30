import { getCurrentUser } from "@/lib/auth";
import { getHomeFeed } from "@/lib/posts";
import { redirect } from "next/navigation";
import HomeFeed from "@/components/home/HomeFeed";
import PostComposer from "@/components/home/PostComposer";
import RightSidebar from "@/components/home/RightSidebar";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const posts = await getHomeFeed(user.id);

  return (
    <div className="flex min-h-screen max-w-6xl mx-auto">
      {/* Center feed */}
      <main className="flex-1 border-x border-border min-h-screen">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3">
          <h1 className="font-bold text-xl">Home</h1>
        </div>
        <PostComposer
          authorId={user.id}
          avatarUrl={user.avatarUrl ?? undefined}
        />
        <HomeFeed initialPosts={posts} currentUserId={user.id} />
      </main>

      {/* Right sidebar */}
      <aside className="hidden lg:block w-80 pl-6 pt-4">
        <div className="sticky top-4">
          <RightSidebar user={user} />
        </div>
      </aside>
    </div>
  );
}
