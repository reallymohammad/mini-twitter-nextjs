"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Pin, Repeat2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { PostWithRelations } from "@/lib/types/post";
import PostActions from "./PostActions";
import PostDropdown from "./PostDropdown";

interface PostCardProps {
  post: PostWithRelations;
  currentUserId?: string;
  locale: string;
  redirectAfterDelete?: boolean;
  fallbackHref?: string;
  /** اگه این پست توسط کسی repost شده، اسمش رو نشون بده */
  repostedByName?: string;
}

export default function PostCard({
  post,
  currentUserId,
  locale,
  redirectAfterDelete = false,
  fallbackHref = `/${locale}`,
  repostedByName,
}: PostCardProps) {
  const router = useRouter();
  const t = useTranslations("PostDropdown");

  const isQuote = Boolean(post.quoteOfId && post.quotedPost);
  const displayAuthor = post.author;

  const isPinned = Boolean(
    post.pinnedBy?.some((pin) => pin.userId === currentUserId)
  );

  return (
    <article
      onClick={() => router.push(`/${locale}/status/${post.id}`)}
      className="block cursor-pointer border-b border-border p-3 transition hover:bg-accent/40"
    >
      {repostedByName && (
        <div className="mb-1.5 ml-8 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Repeat2 className="size-3.5 text-green-500" />
          <span>{repostedByName} reposted</span>
        </div>
      )}

      {isPinned && (
        <div className="mb-1.5 ml-8 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Pin className="size-3.5 -rotate-45 fill-current text-indigo-500" />
          <span>{t("pinnedText")}</span>
        </div>
      )}

      {post.replyToId && (
        <div className="mb-1.5 ml-8 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="size-3" />
          <span>{t("replyingToPost")}</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="shrink-0">
          <Link href={`/${locale}/${displayAuthor.username}`} onClick={(e) => e.stopPropagation()}>
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
              <span className="text-xs text-muted-foreground">@{displayAuthor.username}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground hover:underline">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <PostDropdown
                postId={post.id}
                authorId={displayAuthor.id}
                currentUserId={currentUserId}
              
                isPinned={isPinned}
                redirectAfterDelete={redirectAfterDelete}
                fallbackHref={fallbackHref}
              />
            </div>
          </div>

          {post.content && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
              {post.content}
            </p>
          )}

          {post.mediaUrls?.length > 0 && (
            <div className="mt-2 max-h-[350px] overflow-hidden rounded-xl border border-border">
              <Image
                src={post.mediaUrls[0]}
                alt="Post attachment"
                width={500}
                height={300}
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          {isQuote && post.quotedPost && (
            <div
              onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/status/${post.quotedPost!.id}`); }}
              className="mt-2 cursor-pointer rounded-xl border border-border p-3 hover:bg-accent/30"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span>{post.quotedPost.author.fullName}</span>
                <span className="font-normal text-muted-foreground">@{post.quotedPost.author.username}</span>
              </div>
              {post.quotedPost.content && (
                <p className="mt-1 text-sm text-foreground line-clamp-3">{post.quotedPost.content}</p>
              )}
            </div>
          )}

          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <PostActions post={post} currentUserId={currentUserId} />
          </div>
        </div>
      </div>
    </article>
  );
}
