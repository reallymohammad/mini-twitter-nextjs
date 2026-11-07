// components/post/PostActions.tsx
"use client";

import { MessageCircle, Repeat2, Heart, Share, Quote, Bookmark, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { PostWithRelations } from "@/lib/types/post";
import Composer from "./Composer";

interface PostActionsProps {
  post: PostWithRelations;
  currentUserId?: string;
  currentUser?: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export default function PostActions({ post, currentUserId, currentUser }: PostActionsProps) {
  const router = useRouter();

  // خواندن مقادیر اولیه با اولویت فیلدهای denormalized و fallback به _count
  const [likes, setLikes] = useState(post.likeCount ?? post._count?.likes ?? 0);
  const [reposts, setReposts] = useState(post.repostCount ?? post._count?.reposts ?? 0);
  const [quotes, setQuotes] = useState(post.quoteCount ?? post._count?.quotes ?? 0);

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
      if (!res.ok) {
        setIsLiked(!next);
        setLikes(prev);
      } else {
        router.refresh();
      }
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
      if (!res.ok) {
        setIsReposted(!next);
        setReposts(prev);
      } else {
        router.refresh();
      }
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

  const activeUser = currentUser || {
    id: currentUserId || "",
    username: "me",
    name: "Me",
    avatarUrl: null,
  };

  // فرمت کلاسیک توییتر: عدد کنار آیکون، مجموع ریتوییت ساده + کوت است
  const totalReposts = reposts + quotes;

  return (
    <>
      <div className="mt-3 flex items-center justify-between text-muted-foreground">
        {/* Reply */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/status/${post.id}`);
          }}
          className="group flex items-center gap-1.5 transition-colors hover:text-blue-500"
        >
          <div className="rounded-full p-2 transition-colors group-hover:bg-blue-500/10">
            <MessageCircle className="size-4" />
          </div>
          {(post.replyCount ?? post._count?.replies ?? 0) > 0 && (
            <span className="text-xs tabular-nums">
              {post.replyCount ?? post._count?.replies}
            </span>
          )}
        </button>

        {/* Repost & Quote Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowRepostMenu((v) => !v);
            }}
            disabled={isReposting}
            className={cn(
              "group flex items-center gap-1.5 transition-colors",
              isReposted ? "text-green-500" : "hover:text-green-500"
            )}
          >
            <div
              className={cn(
                "rounded-full p-2 transition-colors",
                isReposted ? "bg-green-500/10" : "group-hover:bg-green-500/10"
              )}
            >
              <Repeat2 className="size-4" />
            </div>
            {totalReposts > 0 && (
              <span className="text-xs tabular-nums">{totalReposts}</span>
            )}
          </button>

          {showRepostMenu && (
            <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[170px] overflow-hidden rounded-xl border border-border bg-popover shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRepost();
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2.5">
                  <Repeat2 className="size-4" />
                  <span>{isReposted ? "Undo Repost" : "Repost"}</span>
                </div>
                {reposts > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">{reposts}</span>
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRepostMenu(false);
                  setShowQuoteModal(true);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2.5">
                  <Quote className="size-4" />
                  <span>Quote</span>
                </div>
                {quotes > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">{quotes}</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Like */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={cn(
            "group flex items-center gap-1.5 transition-colors",
            isLiked ? "text-rose-500" : "hover:text-rose-500"
          )}
        >
          <div
            className={cn(
              "rounded-full p-2 transition-colors",
              isLiked ? "bg-rose-500/10" : "group-hover:bg-rose-500/10"
            )}
          >
            <Heart className={cn("size-4", isLiked && "fill-current")} />
          </div>
          {likes > 0 && <span className="text-xs tabular-nums">{likes}</span>}
        </button>

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          disabled={isBookmarking}
          className={cn(
            "group flex items-center gap-1.5 transition-colors",
            isBookmarked ? "text-amber-500" : "hover:text-amber-500"
          )}
        >
          <div
            className={cn(
              "rounded-full p-2 transition-colors",
              isBookmarked ? "bg-amber-500/10" : "group-hover:bg-amber-500/10"
            )}
          >
            <Bookmark className={cn("size-4", isBookmarked && "fill-current")} />
          </div>
        </button>

        {/* Share */}
        <button className="group flex items-center gap-1.5 transition-colors hover:text-blue-500">
          <div className="rounded-full p-2 transition-colors group-hover:bg-blue-500/10">
            <Share className="size-4" />
          </div>
        </button>
      </div>

      {/* مدال کوت با آپدیت خوش‌بینانه تعداد کوت‌ها */}
      {showQuoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowQuoteModal(false);
          }}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border/80 px-4 py-2.5">
              <span className="text-sm font-semibold text-foreground">Quote Post</span>
              <button
                type="button"
                onClick={() => setShowQuoteModal(false)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <Composer
                currentUser={activeUser}
                quotedPostId={post.id}
                quotedPost={post}
                autoFocus
                onSuccess={() => {
                  setShowQuoteModal(false);
                  setQuotes((c) => c + 1); // آپدیت خوش‌بینانه بدون نیاز به رفرش طولانی
                  router.refresh();
                }}
                onRemoveQuote={() => setShowQuoteModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
