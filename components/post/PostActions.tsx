// components/post/PostActions.tsx

"use client";

import { MessageCircle, Repeat2, Heart, Share, Quote, Bookmark } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { PostWithRelations } from "@/lib/types/post";

interface PostActionsProps {
  post: PostWithRelations;
  currentUserId?: string;
}

export default function PostActions({ post, currentUserId }: PostActionsProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(post._count?.likes ?? 0);
  const [reposts, setReposts] = useState(post._count?.reposts ?? 0);
  const [isLiked, setIsLiked] = useState(
  post.isLiked ?? post.likes?.some((l) => l.userId === currentUserId) ?? false
);
const [isReposted, setIsReposted] = useState(
  post.isReposted ?? post.reposts?.some((r) => r.userId === currentUserId) ?? false
);
const [isBookmarked, setIsBookmarked] = useState(
  post.isBookmarked ?? post.bookmarks?.some((b) => b.userId === currentUserId) ?? false
);

  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRepostMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLiking) return;
    setIsLiking(true);
    const next = !isLiked;
    const prev = likes;
    setIsLiked(next);
    setLikes((c) => (next ? c + 1 : Math.max(0, c - 1)));
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) { setIsLiked(!next); setLikes(prev); }
      else router.refresh();
    } catch {
      setIsLiked(!next);
      setLikes(prev);
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepost = async () => {
    if (isReposting) return;
    setShowRepostMenu(false);
    setIsReposting(true);
    const next = !isReposted;
    const prev = reposts;
    setIsReposted(next);
    setReposts((c) => (next ? c + 1 : Math.max(0, c - 1)));
    try {
      const res = await fetch(`/api/posts/${post.id}/repost`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) { setIsReposted(!next); setReposts(prev); }
      else router.refresh();
    } catch {
      setIsReposted(!next);
      setReposts(prev);
    } finally {
      setIsReposting(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBookmarking) return;
    setIsBookmarking(true);
    const next = !isBookmarked;
    setIsBookmarked(next);
    try {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: "POST" });
      if (!res.ok) setIsBookmarked(!next);
      else router.refresh();
    } catch {
      setIsBookmarked(!next);
    } finally {
      setIsBookmarking(false);
    }
  };

  return (
    <>
      <div className="mt-3 flex items-center justify-between text-muted-foreground">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/status/${post.id}`); }}
          className="group flex items-center gap-2 transition-colors hover:text-blue-500"
        >
          <div className="rounded-full p-2 transition-colors group-hover:bg-blue-500/10">
            <MessageCircle className="size-4" />
          </div>
          <span className="text-sm">{post._count.replies}</span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRepostMenu((v) => !v); }}
            disabled={isReposting}
            className={cn(
              "group flex items-center gap-2 transition-colors",
              isReposted ? "text-green-500" : "hover:text-green-500"
            )}
          >
            <div className={cn(
              "rounded-full p-2 transition-colors",
              isReposted ? "bg-green-500/10" : "group-hover:bg-green-500/10"
            )}>
              <Repeat2 className="size-4" />
            </div>
            <span className="text-sm">{reposts}</span>
          </button>

          {showRepostMenu && (
            <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[160px] overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
              <button
                onClick={(e) => { e.stopPropagation(); handleRepost(); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-accent"
              >
                <Repeat2 className="size-4" />
                {isReposted ? "Undo Repost" : "Repost"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRepostMenu(false);
                  setShowQuoteModal(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-accent"
              >
                <Quote className="size-4" />
                Quote
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLike}
          disabled={isLiking}
          className={cn(
            "group flex items-center gap-2 transition-colors",
            isLiked ? "text-rose-500" : "hover:text-rose-500"
          )}
        >
          <div className={cn(
            "rounded-full p-2 transition-colors",
            isLiked ? "bg-rose-500/10" : "group-hover:bg-rose-500/10"
          )}>
            <Heart className={cn("size-4", isLiked && "fill-current")} />
          </div>
          <span className="text-sm">{likes}</span>
        </button>

        <button
          onClick={handleBookmark}
          disabled={isBookmarking}
          className={cn(
            "group flex items-center gap-2 transition-colors",
            isBookmarked ? "text-amber-500" : "hover:text-amber-500"
          )}
        >
          <div className={cn(
            "rounded-full p-2 transition-colors",
            isBookmarked ? "bg-amber-500/10" : "group-hover:bg-amber-500/10"
          )}>
            <Bookmark className={cn("size-4", isBookmarked && "fill-current")} />
          </div>
        </button>

        <button className="group flex items-center gap-2 transition-colors hover:text-blue-500">
          <div className="rounded-full p-2 transition-colors group-hover:bg-blue-500/10">
            <Share className="size-4" />
          </div>
        </button>
      </div>

      {showQuoteModal && (
        <QuoteModal
          quotedPostId={post.id}
          onClose={() => setShowQuoteModal(false)}
          onSuccess={() => { setShowQuoteModal(false); router.refresh(); }}
        />
      )}
    </>
  );
}

function QuoteModal({
  quotedPostId,
  onClose,
  onSuccess,
}: {
  quotedPostId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, quoteOfId: quotedPostId }),
      });
      if (res.ok) onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-background p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="flex flex-col gap-3">
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            className="w-full resize-none rounded-xl bg-muted px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim() || loading}
              className="rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background transition-opacity disabled:opacity-40"
            >
              {loading ? "Posting…" : "Quote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
