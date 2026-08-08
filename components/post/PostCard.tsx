// components/post/PostCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Pin, Repeat2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { PostWithRelations } from "@/types";
import PostActions from "./PostActions";
import PostDropdown from "./PostDropdown";

interface PostCardProps {
  post: PostWithRelations;
  currentUserId?: string;
  locale: string;
  redirectAfterDelete?: boolean;
  fallbackHref?: string;
}

export default function PostCard({
  post,
  currentUserId,
  locale,
  redirectAfterDelete = false,
  fallbackHref = `/${locale}`,
}: PostCardProps) {
  const router = useRouter();
  const t = useTranslations("PostDropdown");

  const isRetweet = post.type === "RETWEET";
  const displayPost = isRetweet && post.retweetOf ? post.retweetOf : post;
  const displayAuthor = displayPost.author ?? post.author;

  // بررسی پین بودن پست بر اساس رابطه pinnedBy در دیتابیس شما
  // چک می‌کنیم آیا این پست توسط نویسنده‌اش (یا کاربر فعلی در صورت نیاز) پین شده است یا خیر
  const isPinned = Boolean(displayPost.pinnedBy?.some((pin) => pin.userId === currentUserId));

  const handleCardClick = () => {
    router.push(`/${locale}/status/${displayPost.id}`);
  };

  return (
    <article
      onClick={handleCardClick}
      className="block cursor-pointer border-b border-border p-3 transition hover:bg-accent/40"
    >
      {/* هدر پست پین‌شده (با آیکون پین کج توییتر) */}
      {isPinned && (
        <div className="mb-1.5 ml-8 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Pin className="size-3.5 -rotate-45 fill-current text-indigo-500" />
          <span>{t("pinnedText")}</span>
        </div>
      )}

      {/* هدر ریتوییت */}
      {isRetweet && (
        <div className="mb-1 ml-8 flex items-center gap-2 text-xs text-muted-foreground">
          <Repeat2 className="size-3.5" />
          <Link
            href={`/${locale}/${post.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold hover:underline"
          >
            {post.author.fullName}
          </Link>
          <span>{t("retweeted")}</span>
        </div>
      )}

      {/* هدر ریپلای */}
      {post.type === "REPLY" && (
        <div className="mb-1.5 ml-8 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="size-3" />
          <span>{t("replyingToPost")}</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* تصویر آواتار نویسنده */}
        <div className="shrink-0">
          <Link
            href={`/${locale}/${displayAuthor.username}`}
            onClick={(e) => e.stopPropagation()}
          >
            {displayAuthor.avatarUrl ? (
              <Image
                src={displayAuthor.avatarUrl}
                alt={displayAuthor.username}
                width={40}
                height={40}
                className="size-10 rounded-full object-cover transition-opacity hover:opacity-90"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground">
                {displayAuthor.username[0]?.toUpperCase()}
              </div>
            )}
          </Link>
        </div>

        {/* محتوای توییت */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Link
                href={`/${locale}/${displayAuthor.username}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate text-sm font-bold text-foreground hover:underline"
              >
                {displayAuthor.fullName}
              </Link>
              <span className="text-xs text-muted-foreground">
                @{displayAuthor.username}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground hover:underline">
                {formatDistanceToNow(new Date(displayPost.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* منوی دراپ‌داون سه نقطه */}
            <div onClick={(e) => e.stopPropagation()}>
              <PostDropdown
                postId={displayPost.id}
                authorId={displayAuthor.id}
                currentUserId={currentUserId}
                locale={locale}
                isPinned={isPinned}
                redirectAfterDelete={redirectAfterDelete}
                fallbackHref={fallbackHref}
              />
            </div>
          </div>

          {displayPost.content && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
              {displayPost.content}
            </p>
          )}

          {displayPost.imageUrl && (
            <div className="mt-2 max-h-[350px] overflow-hidden rounded-xl border border-border">
              <Image
                src={displayPost.imageUrl}
                alt="Post attachment"
                width={500}
                height={300}
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          {/* بخش تعاملی پایین پست */}
          <div
            className="mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <PostActions
              post={displayPost as any}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
