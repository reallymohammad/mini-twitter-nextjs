"use client";

import { useState } from "react";
import type { PostWithRelations } from "@/types/post";
import RetweetQuoteModal from "./RetweetQuoteModal";

interface Props {
  post: PostWithRelations;
  currentUserId: string;
  onUpdate: (post: PostWithRelations) => void;
  onNewPost: (post: PostWithRelations) => void;
}

export default function PostActions({ post, currentUserId, onUpdate, onNewPost }: Props) {
  const isLiked = post.likes.some((l) => l.userId === currentUserId);
  const isRetweeted = post.retweets.some((r) => r.authorId === currentUserId);
  const [showModal, setShowModal] = useState<"retweet" | "quote" | null>(null);

  async function toggleLike() {
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
    }
  }

  async function toggleRetweet() {
    if (isRetweeted) {
      const res = await fetch(`/api/posts/${post.id}/retweet`, { method: "DELETE" });
      if (res.ok) onUpdate(await res.json());
    } else {
      setShowModal("retweet");
    }
  }

  return (
    <>
      <div className="flex gap-6 mt-2 text-muted-foreground text-sm">
        {/* Reply */}
        <button
          onClick={() => setShowModal("quote")}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          💬 <span>{post.replies.length}</span>
        </button>

        {/* Retweet */}
        <button
          onClick={toggleRetweet}
          className={`flex items-center gap-1 hover:text-green-500 transition-colors ${isRetweeted ? "text-green-500" : ""}`}
        >
          🔁 <span>{post.retweets.length}</span>
        </button>

        {/* Like */}
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1 hover:text-red-500 transition-colors ${isLiked ? "text-red-500" : ""}`}
        >
          {isLiked ? "❤️" : "🤍"} <span>{post.likes.length}</span>
        </button>

        {/* Quote */}
        <button
          onClick={() => setShowModal("quote")}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          📝
        </button>
      </div>

      {showModal && (
        <RetweetQuoteModal
          post={post}
          mode={showModal}
          onClose={() => setShowModal(null)}
          onSuccess={(newPost) => {
            onNewPost(newPost);
            setShowModal(null);
          }}
        />
      )}
    </>
  );
}
