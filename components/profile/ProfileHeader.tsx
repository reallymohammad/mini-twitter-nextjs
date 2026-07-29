// components/profile/ProfileHeader.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Link2 } from "lucide-react";

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
}

interface Props {
  user: User;
  counts: { followers: number; following: number; posts: number };
  isOwner: boolean;
  isFollowing: boolean;
  currentUserId?: string;
  locale: string;
}

export default function ProfileHeader({ user, counts, isOwner, isFollowing, currentUserId, locale }: Props) {
  const router = useRouter();

  async function handleFollow() {
    await fetch("/api/follow", {
      method: isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: user.id }),
    });
    router.refresh();
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Cover */}
      <div className="h-36 bg-muted relative overflow-hidden">
        {user.coverImageUrl && (
          <Image src={user.coverImageUrl} alt="Cover" fill className="object-cover" />
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar + action button row */}
        <div className="flex items-end justify-between -mt-10 mb-3">
          <div className="w-20 h-20 rounded-full border-4 border-background bg-muted overflow-hidden relative">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.fullName} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                {user.fullName[0]}
              </div>
            )}
          </div>

          {isOwner ? (
            <button
              onClick={() => router.push(`/${locale}/settings/profile`)}
              className="px-4 py-1.5 text-sm font-medium rounded-full border border-border hover:bg-muted transition-colors"
            >
              Edit profile
            </button>
          ) : currentUserId ? (
            <button
              onClick={handleFollow}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isFollowing
                  ? "border border-border hover:bg-muted"
                  : "bg-foreground text-background hover:opacity-90"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          ) : null}
        </div>

        {/* Name & username */}
        <h1 className="text-lg font-bold leading-tight">{user.fullName}</h1>
        <p className="text-sm text-muted-foreground mb-3">@{user.username}</p>

        {/* Bio */}
        {user.bio && <p className="text-sm mb-3 leading-relaxed">{user.bio}</p>}

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
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
          <span>
            <strong className="font-semibold">{counts.following}</strong>{" "}
            <span className="text-muted-foreground">Following</span>
          </span>
          <span>
            <strong className="font-semibold">{counts.followers}</strong>{" "}
            <span className="text-muted-foreground">Followers</span>
          </span>
        </div>
      </div>
    </div>
  );
}
