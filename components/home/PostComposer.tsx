"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  authorId: string;
  avatarUrl?: string;
  parentId?: string;
  onSuccess?: (post: unknown) => void;
}

export default function PostComposer({ avatarUrl, parentId, onSuccess }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        type: parentId ? "REPLY" : "POST",
        parentId,
      }),
    });

    if (res.ok) {
      const post = await res.json();
      setContent("");
      onSuccess?.(post);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 p-4 border-b border-border">
      {avatarUrl && (
        <Image
          src={avatarUrl}
          alt="avatar"
          width={40}
          height={40}
          className="rounded-full w-10 h-10 object-cover shrink-0"
        />
      )}
      <div className="flex-1 flex flex-col gap-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          rows={3}
          maxLength={280}
          className="w-full bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!content.trim() || loading}
            className="bg-primary text-primary-foreground rounded-full px-5 py-1.5 font-semibold text-sm disabled:opacity-50"
          >
            {loading ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
