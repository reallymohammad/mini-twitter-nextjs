// components/profile/ProfileTabs.tsx
import Link from "next/link";
import PostCard from "./PostCard";
import EmptyState from "./EmptyState";

interface Post {
  id: string;
  content: string;
  createdAt: Date;
  _count: { likes: number };
}

interface Props {
  username: string;
  locale: string;
  activeTab: string;
  posts: Post[];
}

const TABS = ["posts", "replies", "media", "likes"] as const;

export default function ProfileTabs({ username, locale, activeTab, posts }: Props) {
  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/${locale}/${username}?tab=${tab}`}
            className={`flex-1 py-3 text-sm font-medium text-center capitalize transition-colors hover:bg-muted/50 ${
              activeTab === tab
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {tab}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="divide-y divide-border">
        {activeTab === "replies" || activeTab === "media" ? (
          <EmptyState tab={activeTab} />
        ) : posts.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
