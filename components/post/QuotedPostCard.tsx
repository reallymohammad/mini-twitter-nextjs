"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, BadgeCheck, Lock } from "lucide-react";
import type { Badge } from "@prisma/client";
import { useTranslations } from "next-intl";

import BlockedPostPlaceholder from "./BlockedPostPlaceholder";

interface QuotedAuthor {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  badge?: Badge | null;
  isPrivate?: boolean;
  blockedBy?: Array<{ blockerId: string }>;
  blocking?: Array<{ blockedId: string }>;
}

interface QuotedPostData {
  id: string;
  content: string | null;
  mediaUrls: string[];
  createdAt: Date | string;
  deletedAt?: Date | string | null;
  author: QuotedAuthor;
}

interface QuotedPostCardProps {
  quotedPost?: QuotedPostData | null;
  locale: string;
}

const badgeConfig: Record<Badge, { className: string; label: string } | null> = {
  NONE: null,
  BLUE: {
    className: "text-blue-500",
    label: "Blue verified account",
  },
  GOLD: {
    className: "text-amber-400",
    label: "Gold verified account",
  },
  GREY: {
    className: "text-neutral-400",
    label: "Grey verified account",
  },
  DEVELOPER: {
    className: "text-emerald-500",
    label: "Developer account",
  },
};

export function QuotedBadge({ badge }: { badge?: Badge | null }) {
  const activeBadge = badge ? badgeConfig[badge] : null;

  if (!activeBadge) return null;

  return (
    <BadgeCheck
      size={18}
      className={`inline-block shrink-0 ${activeBadge.className}`}
      aria-label={activeBadge.label}
    />
  );
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|ogg)$/i.test(url);
}

export default function QuotedPostCard({
  quotedPost,
  locale,
}: QuotedPostCardProps) {
  const router = useRouter();
  const t = useTranslations("Post");
  const [showBlockedContent, setShowBlockedContent] = useState(false);

  if (!quotedPost || quotedPost.deletedAt != null) {
    return (
      <div
        className="mt-2.5 flex select-none items-center gap-2.5 rounded-2xl border border-border/70 bg-muted/30 p-3.5 text-xs text-muted-foreground"
        role="status"
      >
        <AlertCircle
          className="size-4 shrink-0 text-muted-foreground/80"
          aria-hidden="true"
        />
        <span className="font-medium">{t("postUnavailable")}</span>
      </div>
    );
  }

  const isBlockedByViewer = Boolean(quotedPost.author.blockedBy?.length);
  const isBlockingViewer = Boolean(quotedPost.author.blocking?.length);

  if (isBlockingViewer) {
    return null;
  }

  if (isBlockedByViewer && !showBlockedContent) {
    return (
      <div className="mt-2.5">
        <BlockedPostPlaceholder
          onView={() => setShowBlockedContent(true)}
        />
      </div>
    );
  }

  const { author, content, mediaUrls, createdAt } = quotedPost;

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        router.push(`/${locale}/status/${quotedPost.id}`);
      }}
      className="group/quote mt-2.5 cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-background/50 transition hover:border-border hover:bg-accent/20"
    >
      <div className="p-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/${locale}/${author.username}`);
            }}
            className="flex min-w-0 cursor-pointer items-center gap-1.5"
          >
            {author.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt={author.username}
                width={20}
                height={20}
                className="size-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                {author.username[0]?.toUpperCase()}
              </div>
            )}

            <span className="truncate text-xs font-bold text-foreground group-hover/quote:underline">
              {author.fullName}
            </span>

            <QuotedBadge badge={author.badge} />

            {author.isPrivate && (
              <Lock
                className="size-3 shrink-0 text-muted-foreground"
                aria-label="Private account"
              />
            )}

            <span className="truncate text-xs text-muted-foreground">
              <bdi>@{author.username}</bdi>
            </span>
          </div>

          <span className="shrink-0 text-xs text-muted-foreground">·</span>

          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), {
              addSuffix: false,
            })}
          </span>
        </div>

        {content && (
          <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap break-words text-sm text-foreground/95">
            {content}
          </p>
        )}
      </div>

      {mediaUrls.length > 0 && (
        <div className="border-t border-border/60">
          {mediaUrls.length === 1 ? (
            <div className="relative aspect-video max-h-60 w-full overflow-hidden bg-black/5">
              {isVideo(mediaUrls[0]) ? (
                <video
                  src={mediaUrls[0]}
                  className="h-full w-full object-cover"
                  controls={false}
                  preload="metadata"
                />
              ) : (
                <Image
                  src={mediaUrls[0]}
                  alt="Quoted attachment"
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover transition duration-200 group-hover/quote:scale-[1.01]"
                />
              )}
            </div>
          ) : (
            <div className="grid max-h-52 grid-cols-2 gap-0.5 overflow-hidden bg-black/5">
              {mediaUrls.slice(0, 4).map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative aspect-video w-full"
                >
                  {isVideo(url) ? (
                    <video
                      src={url}
                      className="h-full w-full object-cover"
                      controls={false}
                      preload="metadata"
                    />
                  ) : (
                    <Image
                      src={url}
                      alt="Quoted attachment"
                      fill
                      sizes="(max-width: 768px) 50vw, 300px"
                      className="object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
