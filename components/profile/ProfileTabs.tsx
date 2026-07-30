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
  posts: PostWithRelations[];
  currentUserId?: string;
}

export default function ProfileTabs({ username, locale, activeTab, posts, currentUserId }: Props) {
  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/${locale}/${username}?tab=${t.key}`}
            className={`flex-1 text-center py-3 text-sm font-medium transition-colors hover:bg-muted/40 ${
              activeTab === t.key
                ? "border-b-2 border-indigo-500 text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-12">Nothing here yet.</p>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={currentUserId} locale={locale} />
        ))
      )}
    </div>
  );
}
