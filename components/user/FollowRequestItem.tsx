"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Check, X } from "lucide-react";
import type { Badge } from "@prisma/client";

import {
  acceptFollowRequest,
  rejectFollowRequest,
} from "@/lib/actions/follow-requests";

interface FollowRequestItemProps {
  locale: string;
  user: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    badge: Badge;
  };
}

function VerifiedBadge({ badge }: { badge: Badge }) {
  if (badge === "NONE") {
    return null;
  }

  const badgeColor = {
    BLUE: "text-blue-500",
    GOLD: "text-amber-400",
    GREY: "text-neutral-400",
    DEVELOPER: "text-emerald-500",
  }[badge];

  if (!badgeColor) {
    return null;
  }

  return (
    <BadgeCheck
      aria-label="Verified account"
      className={`size-4 shrink-0 ${badgeColor}`}
      fill="none"
      strokeWidth={2.25}
    />
  );
}

export function FollowRequestItem({
  locale,
  user,
}: FollowRequestItemProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"IDLE" | "ACCEPTED" | "REJECTED">(
    "IDLE"
  );

  const handleAccept = () => {
    startTransition(async () => {
      setStatus("ACCEPTED");
      const res = await acceptFollowRequest(user.id);

      if (!res.ok) {
        setStatus("IDLE");
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      setStatus("REJECTED");
      const res = await rejectFollowRequest(user.id);

      if (!res.ok) {
        setStatus("IDLE");
      }
    });
  };

  if (status !== "IDLE") {
    return (
      <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground transition">
        <span>@{user.username}</span>
        <span>
          {status === "ACCEPTED" ? "Request accepted" : "Request declined"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 transition hover:bg-accent/40">
      <Link
        href={`/${locale}/${user.username}`}
        className="flex min-w-0 flex-1 gap-3"
      >
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.username}
              width={40}
              height={40}
              className="size-10 object-cover"
            />
          ) : (
            <span className="font-bold text-muted-foreground">
              {user.username[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-bold text-foreground hover:underline">
              {user.fullName ?? user.username}
            </span>
            <VerifiedBadge badge={user.badge} />
            <span className="truncate text-xs text-muted-foreground">
              @{user.username}
            </span>
          </div>

          {user.bio && (
            <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">
              {user.bio}
            </p>
          )}
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          title="Decline"
          aria-label="Decline"
        >
          <X className="size-4" />
        </button>

        <button
          type="button"
          onClick={handleAccept}
          disabled={isPending}
          className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90 disabled:opacity-50"
          title="Accept"
          aria-label="Accept"
        >
          <Check className="size-4" />
        </button>
      </div>
    </div>
  );
}