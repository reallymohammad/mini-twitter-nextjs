// components/post/InfinitePostList.tsx
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
  userId?: string;
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

      if (!res.ok) {
        throw new Error("Failed to load posts");
      }

      const data = await res.json();

      setPosts((previousPosts) => [...previousPosts, ...data.posts]);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error("Failed to load more posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inView && cursor && !loading) {
      loadMorePosts();
    }
  }, [inView, cursor, loading]);

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

      {cursor && (
        <div ref={ref} className="flex justify-center p-4">
          {loading && (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          )}
        </div>
      )}
    </div>
  );
}
