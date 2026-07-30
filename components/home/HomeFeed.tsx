"use client";

import { useState } from "react";
import type { PostWithRelations } from "@/types/post";
import PostCard from "./PostCard";

interface Props {
  initialPosts: PostWithRelations[];
  currentUserId: string;
}

export default function HomeFeed({ initialPosts, currentUserId }: Props) {
  const [posts, setPosts] = useState(initialPosts);

  function handleNewPost(post: PostWithRelations) {
    setPosts((prev) => [post, ...prev]);
  }

  function handleUpdate(updated: PostWithRelations) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg font-semibold">Nothing here yet</p>
        <p className="text-sm mt-1">Follow people to see their posts.</p>
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onUpdate={handleUpdate}
          onNewPost={handleNewPost}
        />
      ))}
    </div>
  );
}
