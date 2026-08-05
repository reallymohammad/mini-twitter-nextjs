"use client";

import { useState } from "react";
import { PostWithRelations } from "@/lib/types/post";

interface Props {
  post: PostWithRelations;
  currentUserId?: string;
  onReply?: () => void;
}

export default function PostActions({ post, currentUserId, onReply }: Props) {
  const [liked, setLiked] = useState(
    currentUserId ? post.likes.some((l) => l.userId === currentUserId) : false
  );
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [retweeted, setRetweeted] = useState(false);
  const [retweetCount, setRetweetCount] = useState(post._count.retweets);

  async function toggleLike() {
    if (!currentUserId) return;
    const method = liked ? "DELETE" : "POST";
    const res = await fetch(`/api/posts/${post.id}/like`, { method });
    if (res.ok) {
      setLiked(!liked);
      setLikeCount((c) => c + (liked ? -1 : 1));
    }
  }

  async function toggleRetweet() {
    if (!currentUserId) return;
    const method = retweeted ? "DELETE" : "POST";
    const res = await fetch(`/api/posts/${post.id}/retweet`, { method });
    if (res.ok) {
      setRetweeted(!retweeted);
      setRetweetCount((c) => c + (retweeted ? -1 : 1));
    }
  }

  return (
    <div className="flex items-center gap-5 mt-3 text-muted-foreground">
      {/* Reply */}
      <button
        onClick={onReply}
        className="flex items-center gap-1.5 text-sm hover:text-indigo-400 transition-colors"
      >
        <ReplyIcon />
        <span>{post._count.replies}</span>
      </button>

      {/* Retweet */}
      <button
        onClick={toggleRetweet}
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          retweeted ? "text-emerald-400" : "hover:text-emerald-400"
        }`}
      >
        <RetweetIcon />
        <span>{retweetCount}</span>
      </button>

      {/* Like */}
      <button
        onClick={toggleLike}
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          liked ? "text-fuchsia-500" : "hover:text-fuchsia-500"
        }`}
      >
        <HeartIcon filled={liked} />
        <span>{likeCount}</span>
      </button>
    </div>
  );
}

function ReplyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function RetweetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
