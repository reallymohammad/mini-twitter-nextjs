"use client";

import { useState, useTransition } from "react";

interface PostActionsProps {
  postId: string;
  initialLiked: boolean;
  initialRetweeted: boolean;   // ← added
  likeCount: number;
  retweetCount: number;
  replyCount: number;
}

export default function PostActions({
  postId,
  initialLiked,
  initialRetweeted,             // ← added
  likeCount,
  retweetCount,
  replyCount,
}: PostActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [retweeted, setRetweeted] = useState(initialRetweeted); // ← was hardcoded false
  const [likes, setLikes] = useState(likeCount);
  const [retweets, setRetweets] = useState(retweetCount);
  const [isPending, startTransition] = useTransition();

  function toggleLike() {
    setLiked((v) => !v);
    setLikes((n) => (liked ? n - 1 : n + 1));
    startTransition(async () => {
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    });
  }

  function toggleRetweet() {
    setRetweeted((v) => !v);
    setRetweets((n) => (retweeted ? n - 1 : n + 1));
    startTransition(async () => {
      await fetch(`/api/posts/${postId}/retweet`, {
        method: retweeted ? "DELETE" : "POST",
      });
    });
  }

  return (
    <div className="flex items-center gap-6 mt-3 text-muted-foreground text-sm select-none">
      {/* Reply */}
      <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>{replyCount}</span>
      </button>

      {/* Retweet */}
      <button
        onClick={toggleRetweet}
        disabled={isPending}
        className={`flex items-center gap-1.5 hover:text-green-500 transition-colors ${retweeted ? "text-green-500" : ""}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        <span>{retweets}</span>
      </button>

      {/* Like */}
      <button
        onClick={toggleLike}
        disabled={isPending}
        className={`flex items-center gap-1.5 hover:text-rose-500 transition-colors ${liked ? "text-rose-500" : ""}`}
      >
        <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span>{likes}</span>
      </button>
    </div>
  );
}
