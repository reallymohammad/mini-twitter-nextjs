"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PostType } from "@prisma/client";

interface Props {
  authorAvatarUrl?: string;
  placeholder?: string;
  type?: PostType;
  parentPostId?: string;
  retweetOfId?: string;
  onSuccess?: () => void;
}

export default function Composer({
  authorAvatarUrl,
  placeholder = "What's happening?",
  type = "POST",
  parentPostId,
  retweetOfId,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "post");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;
    setLoading(true);
    setError("");

    try {
      let imageUrl: string | undefined;
      if (imageFile) imageUrl = await uploadImage(imageFile);

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content: content.trim() || undefined, imageUrl, parentPostId, retweetOfId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post");

      setContent("");
      setImageFile(null);
      setImagePreview(null);
      onSuccess?.();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 p-4 border-b border-border">
      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
        {authorAvatarUrl && (
          <Image src={authorAvatarUrl} alt="You" width={40} height={40} className="object-cover" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={280}
          rows={3}
          className="w-full bg-transparent resize-none text-sm focus:outline-none placeholder:text-muted-foreground"
        />

        {imagePreview && (
          <div className="relative w-full rounded-xl overflow-hidden border border-border">
            <Image src={imagePreview} alt="Preview" width={500} height={300} className="w-full object-cover max-h-60" />
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
            >
              ✕
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ImageIcon />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            {content.length > 0 && (
              <span className={`text-xs ${content.length > 260 ? "text-red-400" : "text-muted-foreground"}`}>
                {280 - content.length}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!content.trim() && !imageFile)}
            className="px-4 py-1.5 text-sm font-semibold rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Posting…" : type === "REPLY" ? "Reply" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
