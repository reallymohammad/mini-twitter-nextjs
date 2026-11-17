// components/user/FollowRequestItem.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { acceptFollowRequest, rejectFollowRequest } from "@/lib/actions/follow-requests";

interface FollowRequestItemProps {
  locale: string;
  user: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
}

export function FollowRequestItem({ locale, user }: FollowRequestItemProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"IDLE" | "ACCEPTED" | "REJECTED">("IDLE");

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
        <span>{status === "ACCEPTED" ? "Request accepted" : "Request declined"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-accent/40 transition">
      <Link href={`/${locale}/${user.username}`} className="flex gap-3 min-w-0 flex-1">
        <div className="size-10 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center">
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
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-foreground hover:underline">
              {user.fullName ?? user.username}
            </span>
            <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
          </div>

          {user.bio && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground break-words">
              {user.bio}
            </p>
          )}
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        <button
          onClick={handleReject}
          disabled={isPending}
          className="size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition disabled:opacity-50"
          title="Decline"
          aria-label="Decline"
        >
          <X className="size-4" />
        </button>

        <button
          onClick={handleAccept}
          disabled={isPending}
          className="size-8 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition disabled:opacity-50"
          title="Accept"
          aria-label="Accept"
        >
          <Check className="size-4" />
        </button>
      </div>
    </div>
  );
}
