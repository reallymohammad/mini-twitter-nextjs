// components/posts/InfinitePostList.tsx
"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import PostCard from "./PostCard";
import { Loader2 } from "lucide-react";

interface InfinitePostListProps {
  initialPosts: any[];
  initialCursor: string | null;
  currentUserId?: string;
  locale: string;
  userId?: string; // اختیاری: برای فیلتر کردن پست‌های یک کاربر خاص
}

export default function InfinitePostList({
  initialPosts,
  initialCursor,
  currentUserId,
  locale,
  userId,
}: InfinitePostListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView();

  const loadMorePosts = async () => {
    if (!cursor || loading) return;

    setLoading(true);
    try {
      const url = new URL("/api/posts", window.location.origin);
      url.searchParams.set("cursor", cursor);
      url.searchParams.set("limit", "10");
      if (userId) {
        url.searchParams.set("userId", userId);
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [...prev, ...data.posts]);
        setCursor(data.nextCursor);
      }
    } catch (err) {
      console.error("Failed to load more posts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inView && cursor) {
      loadMorePosts();
    }
  }, [inView, cursor]);

  return (
    <div className="divide-y divide-border">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          locale={locale}
        />
      ))}

      {/* بخش نمایش لودر در انتهای لیست */}
      {cursor && (
        <div ref={ref} className="flex justify-center p-4">
          {loading && <Loader2 className="animate-spin text-primary h-6 w-6" />}
        </div>
      )}
    </div>
  );
}
