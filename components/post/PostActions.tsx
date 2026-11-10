"use client";

import {
  MessageCircle,
  Repeat2,
  Heart,
  Share,
  Quote,
  Bookmark,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { PostWithRelations } from "@/lib/types/post";
import Composer from "./Composer";
import DeletedPostPlaceholder from "./DeletedPostPlaceholder";
import { usePostUnavailableNotice } from "./usePostUnavailableNotice";

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

export default function PostActions({
  post,
  currentUserId,
  currentUser,
}: PostActionsProps) {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const {
    showPostUnavailable,
    postUnavailableNotice,
  } = usePostUnavailableNotice();

  const locale =
    params?.locale && ["fa", "ar", "en"].includes(params.locale)
      ? `/${params.locale}`
      : "";

  const serverLikes = post._count?.likes ?? post.likeCount ?? 0;
  const serverReposts = post.repostCount ?? post._count?.reposts ?? 0;
  const serverQuotes = post.quoteCount ?? post._count?.quotes ?? 0;

  const serverIsLiked =
    post.isLiked ??
    Boolean(
      currentUserId &&
        post.likes?.some((like) => like.userId === currentUserId)
    );

  const serverIsReposted =
    post.isReposted ??
    Boolean(
      currentUserId &&
        post.reposts?.some((repost) => repost.userId === currentUserId)
    );

  const serverIsBookmarked =
    post.isBookmarked ??
    Boolean(
      currentUserId &&
        post.bookmarks?.some((bookmark) => bookmark.userId === currentUserId)
    );

  const [likes, setLikes] = useState(serverLikes);
  const [reposts, setReposts] = useState(serverReposts);
  const [quotes, setQuotes] = useState(serverQuotes);

  const [isLiked, setIsLiked] = useState(serverIsLiked);
  const [isReposted, setIsReposted] = useState(serverIsReposted);
  const [isBookmarked, setIsBookmarked] = useState(serverIsBookmarked);

  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const likingRef = useRef(false);
  const repostingRef = useRef(false);
  const bookmarkingRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // اگر اطلاعات پست واقعاً به‌روزرسانی شد، وضعیت محلی را همگام کن.
  useEffect(() => {
    setLikes(serverLikes);
    setIsLiked(serverIsLiked);
  }, [post.id, serverLikes, serverIsLiked]);

  useEffect(() => {
    setReposts(serverReposts);
    setIsReposted(serverIsReposted);
  }, [post.id, serverReposts, serverIsReposted]);

  useEffect(() => {
    setQuotes(serverQuotes);
  }, [post.id, serverQuotes]);

  useEffect(() => {
    setIsBookmarked(serverIsBookmarked);
  }, [post.id, serverIsBookmarked]);

  useEffect(() => {
    const handler = (event: globalThis.MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setShowRepostMenu(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLike = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUserId || likingRef.current) return;

    likingRef.current = true;
    setIsLiking(true);

    const previousLiked = isLiked;
    const previousLikes = likes;
    const nextLiked = !previousLiked;

    setIsLiked(nextLiked);
    setLikes(Math.max(0, previousLikes + (nextLiked ? 1 : -1)));

    let succeeded = false;

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: nextLiked ? "POST" : "DELETE",
      });

      if (response.status === 404) {
        setIsLiked(previousLiked);
        setLikes(previousLikes);
        showPostUnavailable();
        return;
      }

      if (!response.ok) {
        throw new Error(`Like request failed: ${response.status}`);
      }

      succeeded = true;
    } catch (error) {
      setIsLiked(previousLiked);
      setLikes(previousLikes);
      console.error(error);
    } finally {
      likingRef.current = false;
      setIsLiking(false);
    }

    if (succeeded) router.refresh();
  };

  const handleRepost = async () => {
    if (!currentUserId || repostingRef.current) return;

    setShowRepostMenu(false);
    repostingRef.current = true;
    setIsReposting(true);

    const previousReposted = isReposted;
    const previousReposts = reposts;
    const nextReposted = !previousReposted;

    setIsReposted(nextReposted);
    setReposts(Math.max(0, previousReposts + (nextReposted ? 1 : -1)));

    let succeeded = false;

    try {
      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: nextReposted ? "POST" : "DELETE",
      });

      if (response.status === 404) {
        setIsReposted(previousReposted);
        setReposts(previousReposts);
        showPostUnavailable();
        return;
      }

      if (!response.ok) {
        throw new Error(`Repost request failed: ${response.status}`);
      }

      succeeded = true;
    } catch (error) {
      setIsReposted(previousReposted);
      setReposts(previousReposts);
      console.error(error);
    } finally {
      repostingRef.current = false;
      setIsReposting(false);
    }

    if (succeeded) router.refresh();
  };

  const handleBookmark = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUserId || bookmarkingRef.current) return;

    bookmarkingRef.current = true;
    setIsBookmarking(true);

    const previousBookmarked = isBookmarked;
    setIsBookmarked(!previousBookmarked);

    let succeeded = false;

    try {
      // API فعلی: POST وضعیت بوکمارک را toggle می‌کند.
      const response = await fetch(`/api/posts/${post.id}/bookmark`, {
        method: "POST",
      });

      if (response.status === 404) {
        setIsBookmarked(previousBookmarked);
        showPostUnavailable();
        return;
      }

      if (!response.ok) {
        throw new Error(`Bookmark request failed: ${response.status}`);
      }

      succeeded = true;
    } catch (error) {
      setIsBookmarked(previousBookmarked);
      console.error(error);
    } finally {
      bookmarkingRef.current = false;
      setIsBookmarking(false);
    }

    if (succeeded) router.refresh();
  };

  const activeUser = currentUser ?? {
    id: currentUserId ?? "",
    username: "me",
    name: "Me",
    avatarUrl: null,
  };

  const totalReposts = reposts + quotes;
const replyCount = post._count?.replies ?? post.replyCount ?? 0;

  // اگر خود پست با deletedAt به این کامپوننت رسیده، اکشن نشان نده.
  const isDeleted = "deletedAt" in post && Boolean(post.deletedAt);

  if (isDeleted) {
    return <DeletedPostPlaceholder className="mt-3" />;
  }

  return (
    <>
      {postUnavailableNotice}

      <div className="mt-3 flex items-center justify-between text-muted-foreground">
        {/* Reply */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            router.push(`${locale}/status/${post.id}`);
          }}
          className="group flex items-center gap-1.5 transition-colors hover:text-blue-500"
          aria-label="Reply"
        >
          <div className="rounded-full p-2 transition-colors group-hover:bg-blue-500/10">
            <MessageCircle className="size-4" />
          </div>
          {replyCount > 0 && (
            <span className="text-xs tabular-nums">{replyCount}</span>
          )}
        </button>

        {/* Repost & Quote */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setShowRepostMenu((value) => !value);
            }}
            disabled={!currentUserId || isReposting}
            title={!currentUserId ? "Sign in to repost or quote" : undefined}
            aria-label="Repost or quote"
            className={cn(
              "group flex items-center gap-1.5 transition-colors",
              isReposted ? "text-green-500" : "hover:text-green-500"
            )}
          >
            <div
              className={cn(
                "rounded-full p-2 transition-colors",
                isReposted
                  ? "bg-green-500/10"
                  : "group-hover:bg-green-500/10"
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
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleRepost();
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2.5">
                  <Repeat2 className="size-4" />
                  <span>{isReposted ? "Undo Repost" : "Repost"}</span>
                </div>
                {reposts > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {reposts}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
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
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {quotes}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          disabled={!currentUserId || isLiking}
          title={!currentUserId ? "Sign in to like" : undefined}
          aria-label={isLiked ? "Unlike" : "Like"}
          aria-pressed={isLiked}
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
          {likes > 0 && (
            <span className="text-xs tabular-nums">{likes}</span>
          )}
        </button>

        {/* Bookmark */}
        <button
          type="button"
          onClick={handleBookmark}
          disabled={!currentUserId || isBookmarking}
          title={!currentUserId ? "Sign in to bookmark" : undefined}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
          aria-pressed={isBookmarked}
          className={cn(
            "group flex items-center gap-1.5 transition-colors",
            isBookmarked ? "text-amber-500" : "hover:text-amber-500"
          )}
        >
          <div
            className={cn(
              "rounded-full p-2 transition-colors",
              isBookmarked
                ? "bg-amber-500/10"
                : "group-hover:bg-amber-500/10"
            )}
          >
            <Bookmark
              className={cn("size-4", isBookmarked && "fill-current")}
            />
          </div>
        </button>

        {/* Share: رفتار فعلی حفظ شده */}
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className="group flex items-center gap-1.5 transition-colors hover:text-blue-500"
          aria-label="Share"
        >
          <div className="rounded-full p-2 transition-colors group-hover:bg-blue-500/10">
            <Share className="size-4" />
          </div>
        </button>
      </div>

      {showQuoteModal && currentUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm"
          onClick={(event) => {
            event.stopPropagation();
            setShowQuoteModal(false);
          }}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border/80 px-4 py-2.5">
              <span className="text-sm font-semibold text-foreground">
                Quote Post
              </span>
              <button
                type="button"
                onClick={() => setShowQuoteModal(false)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close quote"
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
                  setQuotes((count) => count + 1);
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
