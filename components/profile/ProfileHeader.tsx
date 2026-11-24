"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Badge } from "@prisma/client";
import {
  BadgeCheck,
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

import { cn } from "@/lib/utils";
import DirectMessageButton from "@/components/profile/DirectMessageButton";
import ProfileBackButton from "@/components/profile/ProfileBackButton";
import FollowButton from "@/components/user/FollowButton";

interface User {
  id: string;
  fullName: string;
  username: string;
  badge?: Badge | null;
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

type BadgeKey = "blue" | "gold" | "grey" | "developer";

const badgeConfig: Record<Badge, { className: string; key: BadgeKey } | null> = {
  NONE: null,
  BLUE: {
    className: "text-blue-500",
    key: "blue",
  },
  GOLD: {
    className: "text-amber-400",
    key: "gold",
  },
  GREY: {
    className: "text-neutral-400",
    key: "grey",
  },
  DEVELOPER: {
    className: "text-emerald-500",
    key: "developer",
  },
};

interface VerifiedBadgeProps {
  size: number;
  className?: string;
  description: string;
  triggerLabel: string;
}

function VerifiedBadge({
  size,
  className,
  description,
  triggerLabel,
}: VerifiedBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    placement: "top" | "bottom";
  } | null>(null);

  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = isOpen || isHovered || isFocused;

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function closeTooltip() {
    clearCloseTimer();
    setIsOpen(false);
    setIsHovered(false);
    setIsFocused(false);
  }

  function handlePointerEnter(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    clearCloseTimer();
    setIsHovered(true);
  }

  function handlePointerLeave(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 120);
  }

  useEffect(() => {
    if (!isVisible) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !wrapperRef.current?.contains(target) &&
        !tooltipRef.current?.contains(target)
      ) {
        closeTooltip();
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeTooltip();
        triggerRef.current?.blur();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isVisible]);

  useLayoutEffect(() => {
    if (!isVisible || !triggerRef.current) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      const viewportPadding = 8;
      const tooltipWidth = Math.min(
        tooltipRect?.width ?? 288,
        window.innerWidth - viewportPadding * 2,
      );
      const tooltipHeight = tooltipRect?.height ?? 64;
      const centerX = rect.left + rect.width / 2;
      const minCenterX = tooltipWidth / 2 + viewportPadding;
      const maxCenterX = window.innerWidth - minCenterX;
      const placeAbove =
        rect.bottom + 10 + tooltipHeight > window.innerHeight &&
        rect.top > tooltipHeight + 10;

      setPosition({
        left: Math.max(minCenterX, Math.min(centerX, maxCenterX)),
        top: placeAbove ? rect.top - tooltipHeight - 10 : rect.bottom + 10,
        placement: placeAbove ? "top" : "bottom",
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isVisible]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  return (
    <>
      <span ref={wrapperRef} className="inline-flex shrink-0">
        <button
          ref={triggerRef}
          type="button"
          aria-label={triggerLabel}
          aria-expanded={isVisible}
          aria-describedby={isVisible ? tooltipId : undefined}
          onClick={() => setIsOpen((open) => !open)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          className="inline-flex cursor-help rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BadgeCheck
            size={size}
            className={className}
            fill="none"
            aria-hidden="true"
          />
        </button>
      </span>

      {isVisible &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              transform: "translateX(-50%)",
            }}
            className={cn(
              "z-[100] w-max max-w-[min(18rem,calc(100vw-1rem))]",
              "rounded-xl border border-border/80 bg-popover px-3 py-2",
              "text-center text-xs font-medium leading-relaxed text-popover-foreground",
              "break-words shadow-lg shadow-black/10 ring-1 ring-foreground/5",
              "dark:shadow-black/25",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-1/2 size-3 -translate-x-1/2 rotate-45",
                "border-border/80 bg-popover",
                position.placement === "bottom"
                  ? "-top-1.5 border-l border-t"
                  : "-bottom-1.5 border-b border-r",
              )}
            />
            <span className="relative">{description}</span>
          </span>,
          document.body,
        )}
    </>
  );
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
  const tBadges = useTranslations("badges");
  const router = useRouter();

  const [isPendingBlock, startBlockTransition] = useTransition();
  const [isPendingMute, startMuteTransition] = useTransition();

  const [isBlocked, setIsBlocked] = useState(hasBlockedThem);
  const [isMuted, setIsMuted] = useState(isMutedByMe);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const blockExists = isBlocked || isBlockedByThem;
  const activeBadge = user.badge ? badgeConfig[user.badge] : null;
  const badgeDescription = activeBadge ? tBadges(activeBadge.key) : null;
  const badgeTriggerLabel = tBadges("trigger");

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
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-base font-bold">
              {user.fullName || user.username}
            </p>

            {activeBadge && badgeDescription && (
              <VerifiedBadge
                size={16}
                className={cn("shrink-0", activeBadge.className)}
                description={badgeDescription}
                triggerLabel={badgeTriggerLabel}
              />
            )}
          </div>

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
                            : t("muteAccount")}{" "}
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
                          : t("blockAccount")}{" "}
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

          {activeBadge && badgeDescription && (
            <VerifiedBadge
              size={18}
              className={cn("shrink-0", activeBadge.className)}
              description={badgeDescription}
              triggerLabel={badgeTriggerLabel}
            />
          )}

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
