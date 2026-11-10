import Link from "next/link";
import { PostWithRelations } from "@/lib/types/post";
import PostCard from "@/components/post/PostCard";

const TABS = [
  { key: "posts", label: "Posts" },
  { key: "replies", label: "Replies" },
  { key: "likes", label: "Likes" },
];

interface Props {
  username: string;
  locale: string;
  activeTab: string;
  posts: (PostWithRelations & {
    repostedByName?: string;
    isPinnedProfile?: boolean;
  })[];
  currentUserId?: string;
}

export default function ProfileTabs({
  username,
  locale,
  activeTab,
  posts,
  currentUserId,
}: Props) {
  return (
    <div>
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/${locale}/${username}?tab=${tab.key}`}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors hover:bg-muted/40 ${
              activeTab === tab.key
                ? "border-b-2 border-indigo-500 text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={`${post.id}-${post.repostedByName || "direct"}`}
            post={post}
            repostedByName={post.repostedByName}
            isPinnedProfile={post.isPinnedProfile === true}
            currentUserId={currentUserId}
            locale={locale}
          />
        ))
      )}
    </div>
  );
}
