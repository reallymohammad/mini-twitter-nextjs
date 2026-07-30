"use client";

import { useState } from "react";
import type { PostWithRelations } from "@/types/post";

interface Props {
  post: PostWithRelations;
  mode: "retweet" | "quote";
  onClose: () => void;
  onSuccess: (post: PostWithRelations) => void;
}

export default function RetweetQuoteModal({ post, mode, onClose, onSuccess }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body =
      mode === "retweet"
        ? { type: "RETWEET", originalPostId: post.id, content: "" }
        : { type: "QUOTE", quotedPostId: post.id, content };

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      onSuccess(await res.json());
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">
            {mode === "retweet" ? "Retweet" : "Quote Post"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {/* Preview of original post */}
        <div className="border border-border rounded-xl p-3 mb-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">@{post.author.username}</span>
          <p className="mt-1">{post.content}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "quote" && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment…"
              rows={3}
              maxLength={280}
              className="w-full bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground border-b border-border pb-3 mb-4"
            />
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-full border border-border text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (mode === "quote" && !content.trim())}
              className="bg-primary text-primary-foreground rounded-full px-5 py-1.5 font-semibold text-sm disabled:opacity-50"
            >
              {loading ? "…" : mode === "retweet" ? "Retweet" : "Quote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
