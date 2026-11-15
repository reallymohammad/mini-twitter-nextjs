"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

type FollowStatus = "PENDING" | "ACCEPTED" | null;

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
  initialStatus?: FollowStatus;
  currentUserId?: string;
}

export default function FollowButton({
  targetUserId,
  initialIsFollowing = false,
  initialStatus,
  currentUserId,
}: FollowButtonProps) {
  const router = useRouter();
  const t = useTranslations("followButton");

  const [status, setStatus] = useState<"NONE" | "PENDING" | "ACCEPTED">(() => {
    if (initialStatus === "PENDING") return "PENDING";
    if (initialStatus === "ACCEPTED" || initialIsFollowing) return "ACCEPTED";
    return "NONE";
  });

  const [isLoading, setIsLoading] = useState(false);

  if (!currentUserId || currentUserId === targetUserId) {
    return null;
  }

  const handleFollowToggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isLoading) return;

    setIsLoading(true);

    const shouldFollow = status === "NONE";

    try {
      const res = await fetch("/api/follow", {
        method: shouldFollow ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Follow request failed");
      }

      if (shouldFollow) {
        setStatus(data?.status === "PENDING" ? "PENDING" : "ACCEPTED");
      } else {
        // هم لغو درخواست و هم آنفالو به وضعیت NONE می‌رسند.
        setStatus("NONE");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to update follow status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const label =
    status === "ACCEPTED"
      ? t("following")
      : status === "PENDING"
        ? t("requested")
        : t("follow");

  const hoverLabel =
    status === "ACCEPTED"
      ? t("unfollow")
      : status === "PENDING"
        ? t("cancelRequest")
        : t("follow");

  return (
    <button
      type="button"
      onClick={handleFollowToggle}
      disabled={isLoading}
      aria-label={hoverLabel}
      title={hoverLabel}
      className={cn(
        "group shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        status === "NONE"
          ? "bg-foreground text-background hover:opacity-90"
          : "border border-border bg-background text-foreground hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-500"
      )}
    >
      <span className="group-hover:hidden">
        {isLoading ? "…" : label}
      </span>
      <span className="hidden group-hover:inline">
        {isLoading ? "…" : hoverLabel}
      </span>
    </button>
  );
}
