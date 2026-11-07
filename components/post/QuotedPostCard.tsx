// components/posts/QuotedPostCard.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { BadgeCheck, Lock, AlertCircle } from "lucide-react";
import { Badge } from "@prisma/client";

interface QuotedAuthor {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  badge?: Badge;
  isPrivate?: boolean;
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
  quoteOfId?: string | null;
  locale: string;
}

export function QuotedBadge({ badge }: { badge?: Badge }) {
  if (!badge || badge === "NONE") return null;

  const colorMap: Record<Badge, string> = {
    BLUE: "text-sky-500 fill-sky-500",
    GOLD: "text-amber-400 fill-amber-400",
    GREY: "text-neutral-400 fill-neutral-400",
    DEVELOPER: "text-emerald-500 fill-emerald-500",
    NONE: "",
  };

  return <BadgeCheck className={`size-3.5 inline-block shrink-0 ${colorMap[badge]}`} />;
}

export default function QuotedPostCard({
  quotedPost,
  quoteOfId,
  locale,
}: QuotedPostCardProps) {
  const router = useRouter();

  // اگر quoteOfId ست شده ولی آبجکت پست نیست یا سافت دلیت شده:
  if (!quotedPost || quotedPost.deletedAt) {
    return (
      <div className="mt-2.5 flex items-center gap-2 rounded-2xl border border-border/80 bg-muted/40 p-3.5 text-xs text-muted-foreground">
        <AlertCircle className="size-4 shrink-0 text-muted-foreground" />
        <span>This post is unavailable or was deleted by the author.</span>
      </div>
    );
  }

  const { author, content, mediaUrls, createdAt } = quotedPost;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/${locale}/status/${quotedPost.id}`);
      }}
      className="group/quote mt-2.5 overflow-hidden rounded-2xl border border-border/80 bg-background/60 transition hover:border-border hover:bg-accent/20"
    >
      <div className="p-3">
        {/* هدر توییت کوت‌شده: مشخصات نویسنده */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/${author.username}`);
            }}
            className="flex items-center gap-1.5 truncate cursor-pointer"
          >
            {author.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt={author.username}
                width={20}
                height={20}
                className="size-5 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold shrink-0">
                {author.username[0]?.toUpperCase()}
              </div>
            )}

            <span className="truncate text-xs font-bold text-foreground group-hover/quote:underline">
              {author.fullName}
            </span>
            <QuotedBadge badge={author.badge} />
            {author.isPrivate && <Lock className="size-3 text-muted-foreground shrink-0" />}
            <span className="truncate text-xs text-muted-foreground">
              @{author.username}
            </span>
          </div>

          <span className="text-xs text-muted-foreground shrink-0">·</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: false })}
          </span>
        </div>

        {/* محتوای متن کوت */}
        {content && (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-foreground/95 line-clamp-4">
            {content}
          </p>
        )}
      </div>

      {/* مدیای کوت‌شده (تک یا چند مدیا) */}
      {mediaUrls && mediaUrls.length > 0 && (
        <div className="border-t border-border/60">
          {mediaUrls.length === 1 ? (
            <div className="relative aspect-video max-h-56 w-full overflow-hidden">
              <Image
                src={mediaUrls[0]}
                alt="Quoted attachment"
                fill
                className="object-cover transition duration-200 group-hover/quote:scale-[1.01]"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-0.5 max-h-52 overflow-hidden">
              {mediaUrls.slice(0, 4).map((url, i) => (
                <div key={i} className="relative aspect-video w-full">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
