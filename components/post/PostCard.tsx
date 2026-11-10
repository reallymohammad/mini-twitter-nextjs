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
import QuotedPostCard, { QuotedBadge } from "./QuotedPostCard";
import DeletedPostPlaceholder from "./DeletedPostPlaceholder";

interface PostCardProps {
  post: PostWithRelations;
  currentUserId?: string;
  locale: string;
  redirectAfterDelete?: boolean;
  fallbackHref?: string;
  repostedByName?: string;
  isPinnedProfile?: boolean;
  hideReplyContext?: boolean;
  connectAbove?: boolean;
  connectBelow?: boolean;
  dashedAbove?: boolean;
  focused?: boolean;
}

export default function PostCard({
  post,
  currentUserId,
  locale,
  redirectAfterDelete = false,
  fallbackHref = `/${locale}`,
  repostedByName,
  isPinnedProfile,
  hideReplyContext = false,
  connectAbove = false,
  connectBelow = false,
  dashedAbove = false,
  focused = false,
}: PostCardProps) {
  const router = useRouter();
  const t = useTranslations("PostDropdown");

  const quotedTarget = (post as any).quoteOf ?? (post as any).quotedPost;
  const hasQuote = Boolean(post.quoteOfId);
  const displayAuthor = post.author;

  // نبودن relation در کوئری به معنی حذف شدن والد نیست.
  const replyRelationLoaded = Object.prototype.hasOwnProperty.call(
    post,
    "replyTo"
  );

  const parentUnavailable = Boolean(
    post.replyToId &&
      replyRelationLoaded &&
      (!post.replyTo ||
        ("deletedAt" in post.replyTo && post.replyTo.deletedAt !== null))
  );

  const replyToUser = parentUnavailable ? null : post.replyTo?.author;

  const isPinnedForCurrentUser = Boolean(
    currentUserId &&
      post.pinnedBy?.some((pin) => pin.userId === currentUserId)
  );

  const showPinnedBadge = isPinnedProfile ?? isPinnedForCurrentUser;

  return (
    <article
      onClick={() => router.push(`/${locale}/status/${post.id}`)}
      className={`relative cursor-pointer border-b border-border p-3 transition hover:bg-accent/40 ${
        focused ? "bg-accent/15" : ""
      }`}
    >
      {focused && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-0 w-0.5 bg-indigo-500"
        />
      )}

      {repostedByName && (
        <div className="mb-1.5 ms-[52px] flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Repeat2 className="size-3.5 text-green-500" />
          <span>{repostedByName} reposted</span>
        </div>
      )}

      {showPinnedBadge && (
        <div className="mb-1.5 ms-[52px] flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Pin className="size-3.5 -rotate-45 fill-current text-indigo-500" />
          <span>{t("pinnedText")}</span>
        </div>
      )}

      {!hideReplyContext && post.replyToId && (
        parentUnavailable ? (
          <div
            className="mb-2 ps-[52px]"
            onClick={(event) => event.stopPropagation()}
          >
            <DeletedPostPlaceholder className="border-0 bg-transparent px-0 py-0 text-xs" />
          </div>
        ) : (
          <div className="mb-1.5 flex min-w-0 items-center gap-1.5 ps-[52px] text-xs text-muted-foreground">
            <MessageCircle
              className="size-3 shrink-0"
              aria-hidden="true"
            />

            <Link
              href={`/${locale}/status/${post.replyToId}`}
              onClick={(event) => event.stopPropagation()}
              className="shrink-0 hover:underline"
            >
              {t("replyingToPost")}
            </Link>

            {replyToUser && (
              <Link
                href={`/${locale}/${replyToUser.username}`}
                onClick={(event) => event.stopPropagation()}
                className="min-w-0 truncate text-indigo-500 hover:underline"
              >
                <bdi>@{replyToUser.username}</bdi>
              </Link>
            )}
          </div>
        )
      )}

      <div className="flex gap-3">
        <div className="relative w-10 shrink-0 self-stretch">
          {connectAbove && (
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute -top-3 bottom-full left-1/2 w-0.5 -translate-x-1/2 ${
                dashedAbove
                  ? "border-s-2 border-dashed border-muted-foreground/50"
                  : "bg-border"
              }`}
            />
          )}

          <Link
            href={`/${locale}/${displayAuthor.username}`}
            onClick={(event) => event.stopPropagation()}
            className="relative z-[1] block size-10"
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

          {connectBelow && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 top-10 left-1/2 w-0.5 -translate-x-1/2 bg-border"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <Link
                href={`/${locale}/${displayAuthor.username}`}
                onClick={(event) => event.stopPropagation()}
                className="min-w-0 truncate text-sm font-bold text-foreground hover:underline"
              >
                {displayAuthor.fullName}
              </Link>

              <QuotedBadge badge={displayAuthor.badge} />

              <span className="text-xs text-muted-foreground">
                <bdi>@{displayAuthor.username}</bdi>
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            <div
              className="shrink-0"
              onClick={(event) => event.stopPropagation()}
            >
              <PostDropdown
                postId={post.id}
                authorId={displayAuthor.id}
                currentUserId={currentUserId}
                isPinned={isPinnedForCurrentUser}
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

          {hasQuote && (
            <QuotedPostCard
              quotedPost={quotedTarget}
              quoteOfId={post.quoteOfId}
              locale={locale}
            />
          )}

          <div
            className="mt-2"
            onClick={(event) => event.stopPropagation()}
          >
            <PostActions post={post} currentUserId={currentUserId} />
          </div>
        </div>
      </div>
    </article>
  );
}
