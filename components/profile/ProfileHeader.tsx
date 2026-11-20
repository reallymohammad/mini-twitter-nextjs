"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  MapPin,
  Link2,
  Loader2,
  Lock,
  MoreHorizontal,
  UserX,
  UserCheck,
  Copy,
  VolumeX,
  Volume2,
} from "lucide-react";

import DirectMessageButton from "@/components/profile/DirectMessageButton";
import ProfileBackButton from "@/components/profile/ProfileBackButton";
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
  hasBlockedThem: boolean;
  isBlockedByThem: boolean;
  isMutedByMe: boolean;
  canSendDirectMessage: boolean;
}

export default function ProfileHeader({
  user,
  counts,
  isOwner,
  followStatus,
  currentUserId,
  locale,
  hasBlockedThem,
  isBlockedByThem,
  isMutedByMe,
  canSendDirectMessage,
}: Props) {
  const t = useTranslations("profile");
  const router = useRouter();

  const [isPendingBlock, startBlockTransition] = useTransition();
  const [isPendingMute, startMuteTransition] = useTransition();

  const [isBlocked, setIsBlocked] = useState(hasBlockedThem);
  const [isMuted, setIsMuted] = useState(isMutedByMe);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const blockExists = isBlocked || isBlockedByThem;

  useEffect(() => {
    setIsBlocked(hasBlockedThem);
  }, [hasBlockedThem]);

  useEffect(() => {
    setIsMuted(isMutedByMe);
  }, [isMutedByMe]);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  function handleToggleBlock() {
    if (isPendingBlock || isPendingMute) return;

    const nextBlocked = !isBlocked;
    setActionError(null);
    setMenuOpen(false);

    startBlockTransition(async () => {
      try {
        const res = await fetch("/api/block", {
          method: nextBlocked ? "POST" : "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUserId: user.id,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error ?? `Block request failed: ${res.status}`,
          );
        }

        setIsBlocked(nextBlocked);
        router.refresh();
      } catch (error) {
        console.error("Block request failed:", error);
        setActionError(t("blockError"));
      }
    });
  }

  function handleToggleMute() {
    // بلاک از میوت اولویت بالاتری دارد؛ حین عملیات بلاک نیز میوت نکن.
    if (blockExists || isPendingBlock || isPendingMute) return;

    const nextMuted = !isMuted;
    setActionError(null);
    setMenuOpen(false);

    startMuteTransition(async () => {
      try {
        const res = await fetch("/api/mute", {
          method: nextMuted ? "POST" : "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUserId: user.id,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error ?? `Mute request failed: ${res.status}`,
          );
        }

        setIsMuted(nextMuted);
        router.refresh();
      } catch (error) {
        console.error("Mute request failed:", error);
        setActionError(t("muteError"));
      }
    });
  }

  async function handleCopyLink() {
    setMenuOpen(false);

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${locale}/${encodeURIComponent(user.username)}`,
      );
    } catch (error) {
      console.error("Could not copy profile link", error);
    }
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="contents">
      <div className="sticky top-0 z-20 flex h-14 items-center gap-0 border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <ProfileBackButton locale={locale} isOwner={isOwner} />

        <div className="min-w-0">
          <p className="truncate text-base font-bold">
            {user.fullName || user.username}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{user.username}
          </p>
        </div>
      </div>

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
        <div className="-mt-10 mb-3 flex items-end justify-between">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-background bg-muted">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.fullName || user.username}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                {(user.fullName || user.username)[0]}
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
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    aria-label="More actions"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    onClick={() => setMenuOpen((open) => !open)}
                    className="rounded-full border border-border p-2 text-foreground transition-colors hover:bg-muted"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute end-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-background p-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleCopyLink}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
                      >
                        <Copy size={16} />
                        {t("copyLink")}
                      </button>

                      {!blockExists && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleToggleMute}
                          disabled={isPendingMute || isPendingBlock}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted disabled:opacity-50"
                        >
                          {isMuted ? (
                            <Volume2 size={16} />
                          ) : (
                            <VolumeX size={16} />
                          )}
                          {isMuted
                            ? t("unmuteAccount")
                            : t("muteAccount")} {" "}
                          @{user.username}
                        </button>
                      )}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleToggleBlock}
                        disabled={isPendingBlock || isPendingMute}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-destructive hover:bg-muted disabled:opacity-50"
                      >
                        {isBlocked ? (
                          <UserCheck size={16} />
                        ) : (
                          <UserX size={16} />
                        )}
                        {isBlocked
                          ? t("unblockAccount")
                          : t("blockAccount")} {" "}
                        @{user.username}
                      </button>
                    </div>
                  )}
                </div>

                {isBlocked ? (
                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    disabled={isPendingBlock || isPendingMute}
                    className="group min-w-28 rounded-full border border-border bg-foreground px-4 py-1.5 text-sm font-semibold text-background transition-colors hover:border-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    {isPendingBlock ? (
                      <Loader2 size={16} className="mx-auto animate-spin" />
                    ) : (
                      <>
                        <span className="group-hover:hidden">
                          {t("blocked")}
                        </span>
                        <span className="hidden group-hover:inline">
                          {t("unblock")}
                        </span>
                      </>
                    )}
                  </button>
                ) : isBlockedByThem ? null : (
                  <>
                    {canSendDirectMessage && (
                      <DirectMessageButton
                        recipientUserId={user.id}
                        locale={locale}
                        username={user.username}
                      />
                    )}

                    <FollowButton
                      targetUserId={user.id}
                      initialStatus={followStatus}
                      currentUserId={currentUserId}
                    />
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>

        {actionError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {actionError}
          </p>
        )}

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

        {user.bio && (
          <p className="mb-3 text-sm leading-relaxed">{user.bio}</p>
        )}

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

        <div className="flex gap-4 text-sm">
          {blockExists ? (
            <>
              <span>
                <strong className="font-semibold">{counts.following}</strong>{" "}
                <span className="text-muted-foreground">Following</span>
              </span>

              <span>
                <strong className="font-semibold">{counts.followers}</strong>{" "}
                <span className="text-muted-foreground">Followers</span>
              </span>
            </>
          ) : (
            <>
              <Link
                href={`/${locale}/${encodeURIComponent(user.username)}/following`}
                className="hover:underline"
              >
                <strong className="font-semibold">{counts.following}</strong>{" "}
                <span className="text-muted-foreground">Following</span>
              </Link>

              <Link
                href={`/${locale}/${encodeURIComponent(user.username)}/followers`}
                className="hover:underline"
              >
                <strong className="font-semibold">{counts.followers}</strong>{" "}
                <span className="text-muted-foreground">Followers</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
