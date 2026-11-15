// components/profile/ProfileHeader.tsx
"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Link2, Mail, Loader2, Lock } from "lucide-react";
import { startDirectConversation } from "@/lib/dm/actions";
import FollowButton from "@/components/user/FollowButton";

interface User {
  id: string;
  fullName: string;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  location?: string | null;
  website?: string | null;
  createdAt: Date;
  isPrivate: boolean;
}

interface Props {
  user: User;
  counts: { followers: number; following: number; posts: number };
  isOwner: boolean;
  followStatus: "PENDING" | "ACCEPTED" | null;
  currentUserId?: string;
  locale: string;
}

export default function ProfileHeader({
  user,
  counts,
  isOwner,
  followStatus,
  currentUserId,
  locale,
}: Props) {
  const router = useRouter();
  const [isPendingMessage, startMessageTransition] = useTransition();

  function handleDirectMessage() {
    startMessageTransition(async () => {
      try {
        const res = await startDirectConversation(user.id);
        if (res?.conversationId) {
          router.push(`/${locale}/messages/${res.conversationId}`);
        }
      } catch (err: unknown) {
        const error = err as Error;
        alert(error?.message || "امکان ارسال پیام به این کاربر وجود ندارد.");
      }
    });
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Cover */}
      <div className="relative h-36 overflow-hidden bg-muted">
        {user.coverImageUrl && (
          <Image
            src={user.coverImageUrl}
            alt="Cover"
            fill
            className="object-cover"
          />
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar + action button row */}
        <div className="-mt-10 mb-3 flex items-end justify-between">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-background bg-muted">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.fullName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                {user.fullName[0]}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <button
                type="button"
                onClick={() => router.push(`/${locale}/settings/profile`)}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Edit profile
              </button>
            ) : currentUserId ? (
              <>
                {/* Direct Message Button */}
                <button
                  type="button"
                  onClick={handleDirectMessage}
                  disabled={isPendingMessage}
                  title="Direct Message"
                  aria-label="Send direct message"
                  className="rounded-full border border-border p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {isPendingMessage ? (
                    <Loader2
                      size={18}
                      className="animate-spin text-muted-foreground"
                    />
                  ) : (
                    <Mail size={18} />
                  )}
                </button>

                {/* Follow / Requested / Following Button */}
                <FollowButton
                  targetUserId={user.id}
                  initialStatus={followStatus}
                  currentUserId={currentUserId}
                />
              </>
            ) : null}
          </div>
        </div>

        {/* Name & username */}
        <div className="flex items-center gap-1.5">
          <h1 className="text-lg font-bold leading-tight">{user.fullName}</h1>
          {user.isPrivate && (
            <Lock
              size={15}
              className="text-muted-foreground"
              aria-label="Private account"
            />
          )}
        </div>
        <p className="mb-3 text-sm text-muted-foreground">@{user.username}</p>

        {/* Bio */}
        {user.bio && <p className="mb-3 text-sm leading-relaxed">{user.bio}</p>}

        {/* Meta */}
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {user.location && (
            <span className="flex items-center gap-1">
              <MapPin size={14} /> {user.location}
            </span>
          )}
          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Link2 size={14} /> {user.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays size={14} /> Joined {joinDate}
          </span>
        </div>

        {/* Counts */}
        <div className="flex gap-4 text-sm">
          <Link
            href={`/${locale}/${user.username}/following`}
            className="hover:underline"
          >
            <strong className="font-semibold">{counts.following}</strong>{" "}
            <span className="text-muted-foreground">Following</span>
          </Link>
          <Link
            href={`/${locale}/${user.username}/followers`}
            className="hover:underline"
          >
            <strong className="font-semibold">{counts.followers}</strong>{" "}
            <span className="text-muted-foreground">Followers</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
