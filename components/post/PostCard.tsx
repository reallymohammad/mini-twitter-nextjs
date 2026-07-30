import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PostWithRelations } from "@/lib/types/post";
import PostActions from "./PostActions";
import BadgeIcon from "@/components/ui/BadgeIcon";

interface Props {
  post: PostWithRelations;
  currentUserId?: string;
  locale: string;
}

export default function PostCard({ post, currentUserId, locale }: Props) {
  const isRetweet = post.type === "RETWEET";
  const displayPost = isRetweet && post.retweetOf ? post.retweetOf : post;
  const displayAuthor = displayPost.author ?? post.author;

  return (
    <article className="border-b border-border px-4 py-3 hover:bg-muted/30 transition-colors">
      {/* Retweet label */}
      {isRetweet && (
        <p className="text-xs text-muted-foreground mb-1.5 ml-8 flex items-center gap-1">
          <RetweetSmallIcon />
          <Link href={`/${locale}/${post.author.username}`} className="hover:underline">
            {post.author.fullName}
          </Link>{" "}
          retweeted
        </p>
      )}

      {/* Reply label */}
      {post.type === "REPLY" && (
        <p className="text-xs text-muted-foreground mb-1.5 ml-8">
          Replying to a post
        </p>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/${locale}/${displayAuthor.username}`} className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
            {displayAuthor.avatarUrl && (
              <Image src={displayAuthor.avatarUrl} alt={displayAuthor.username} width={40} height={40} className="object-cover" />
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Author row */}
          <div className="flex items-center gap-1 flex-wrap">
            <Link href={`/${locale}/${displayAuthor.username}`} className="font-semibold text-sm hover:underline truncate">
              {displayAuthor.fullName}
            </Link>
            {displayAuthor.badge !== "NONE" && <BadgeIcon badge={displayAuthor.badge} />}
            <span className="text-muted-foreground text-sm">@{displayAuthor.username}</span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(displayPost.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Content */}
          {displayPost.content && (
            <p className="text-sm mt-1 whitespace-pre-wrap break-words">{displayPost.content}</p>
          )}

          {/* Image */}
          {displayPost.imageUrl && (
            <div className="mt-2 rounded-xl overflow-hidden border border-border">
              <Image src={displayPost.imageUrl} alt="Post image" width={500} height={300} className="w-full object-cover max-h-72" />
            </div>
          )}

          {/* Quote embed */}
          {post.type === "QUOTE" && post.retweetOf && (
            <div className="mt-2 border border-border rounded-xl p-3 text-sm">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-semibold">{post.retweetOf.author.fullName}</span>
                <span className="text-muted-foreground text-xs">@{post.retweetOf.author.username}</span>
              </div>
              {post.retweetOf.content && <p className="text-muted-foreground">{post.retweetOf.content}</p>}
            </div>
          )}

          <PostActions post={isRetweet && post.retweetOf ? { ...post.retweetOf, likes: post.likes } as PostWithRelations : post} currentUserId={currentUserId} />
        </div>
      </div>
    </article>
  );
}

function RetweetSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
