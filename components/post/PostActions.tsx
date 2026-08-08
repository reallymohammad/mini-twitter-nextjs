// components/post/PostActions.tsx
"use client";

import { MessageCircle, Repeat2, Heart, Share } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface PostActionsProps {
  postId: string;
  initialLikes: number;
  initialReplies: number;
  initialRetweets: number;
  isLikedByUser: boolean;
  isRetweetedByUser: boolean;
  locale: string;
  onReply?: () => void;
}

export default function PostActions({
  postId,
  initialLikes,
  initialReplies,
  initialRetweets,
  isLikedByUser,
  isRetweetedByUser,
  locale,
  onReply,
}: PostActionsProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(initialLikes);
  const [retweets, setRetweets] = useState(initialRetweets);
  const [isLiked, setIsLiked] = useState(isLikedByUser);
  const [isRetweeted, setIsRetweeted] = useState(isRetweetedByUser);
  const [isLiking, setIsLiking] = useState(false);
  const [isRetweeting, setIsRetweeting] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLiking) return;

    setIsLiking(true);
    const newIsLiked = !isLiked;
    const previousLikes = likes;

    setIsLiked(newIsLiked);
    setLikes(prev => (newIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: newIsLiked ? "POST" : "DELETE",
      });

      if (!response.ok) {
        setIsLiked(!newIsLiked);
        setLikes(previousLikes);
      } else {
        router.refresh();
      }
    } catch (error) {
      setIsLiked(!newIsLiked);
      setLikes(previousLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleRetweet = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRetweeting) return;

    setIsRetweeting(true);
    const newIsRetweeted = !isRetweeted;
    const previousRetweets = retweets;

    setIsRetweeted(newIsRetweeted);
    setRetweets(prev => (newIsRetweeted ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const response = await fetch(`/api/posts/${postId}/retweet`, {
        method: newIsRetweeted ? "POST" : "DELETE",
      });

      if (!response.ok) {
        setIsRetweeted(!newIsRetweeted);
        setRetweets(previousRetweets);
      } else {
        router.refresh();
      }
    } catch (error) {
      setIsRetweeted(!newIsRetweeted);
      setRetweets(previousRetweets);
    } finally {
      setIsRetweeting(false);
    }
  };

  return (
    <div className="flex items-center justify-between mt-3 text-muted-foreground">
      <button
        onClick={onReply || (() => router.push(`/${locale}/post/${postId}`))}
        className="flex items-center gap-2 hover:text-blue-500 transition-colors group"
      >
        <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
          <MessageCircle className="w-4 h-4" />
        </div>
        <span className="text-sm">{initialReplies}</span>
      </button>

      <button
        onClick={handleRetweet}
        disabled={isRetweeting}
        className={cn(
          "flex items-center gap-2 transition-colors group",
          isRetweeted ? "text-green-500" : "hover:text-green-500"
        )}
      >
        <div
          className={cn(
            "p-2 rounded-full transition-colors",
            isRetweeted
              ? "bg-green-500/10"
              : "group-hover:bg-green-500/10"
          )}
        >
          <Repeat2 className="w-4 h-4" />
        </div>
        <span className="text-sm">{retweets}</span>
      </button>

      <button
        onClick={handleLike}
        disabled={isLiking}
        className={cn(
          "flex items-center gap-2 transition-colors group",
          isLiked ? "text-rose-500" : "hover:text-rose-500"
        )}
      >
        <div
          className={cn(
            "p-2 rounded-full transition-colors",
            isLiked ? "bg-rose-500/10" : "group-hover:bg-rose-500/10"
          )}
        >
          <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
        </div>
        <span className="text-sm">{likes}</span>
      </button>

      <button className="flex items-center gap-2 hover:text-blue-500 transition-colors group">
        <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
          <Share className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}
