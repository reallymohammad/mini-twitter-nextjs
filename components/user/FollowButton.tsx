// components/user/FollowButton.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  currentUserId?: string;
}

export default function FollowButton({
  targetUserId,
  initialIsFollowing,
  currentUserId,
}: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  if (!currentUserId || currentUserId === targetUserId) {
    return null;
  }

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;

    setIsLoading(true);
    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      const res = await fetch("/api/follow", {
        method: nextState ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });

      if (!res.ok) {
        setIsFollowing(!nextState); // بازگشت در صورت خطا
      } else {
        router.refresh();
      }
    } catch {
      setIsFollowing(!nextState);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
        isFollowing
          ? "border border-border bg-background text-foreground hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-500 [&>span]:hover:content-['Unfollow']"
          : "bg-foreground text-background hover:opacity-90"
      )}
    >
      <span>{isFollowing ? "Following" : "Follow"}</span>
    </button>
  );
}
