import type { PostWithRelations } from "@/lib/queries/posts";
import PostActions from "./PostActions";
import Image from "next/image";
import Link from "next/link";

interface PostCardProps {
  post: PostWithRelations;
  currentUserId: string;
  locale: string;
  isQuoted?: boolean;
}

export default function PostCard({ post, currentUserId, locale, isQuoted = false }: PostCardProps) {
  const display =
    post.type === "RETWEET" && post.originalPost ? post.originalPost : post;

  const initialLiked = display.likes.some((l) => l.userId === currentUserId);
  const initialRetweeted = display.retweets.some((r) => r.authorId === currentUserId);

  return (
    <article className={`px-4 py-3 ${isQuoted ? "border border-border rounded-xl mt-2" : "border-b border-border hover:bg-muted/30 transition-colors"}`}>
      {post.type === "RETWEET" && (
        <p className="text-xs text-muted-foreground mb-1.5 ml-11">
          🔁 {post.author.name} retweeted
        </p>
      )}

      <div className="flex gap-3">
        <Link href={`/${locale}/${display.author.username}`} className="shrink-0 mt-0.5">
          {display.author.avatarUrl ? (
            <Image
              src={display.author.avatarUrl}
              alt={display.author.name ?? ""}
              width={40}
              height={40}
              className="rounded-full w-10 h-10 object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted" />
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            <Link href={`/${locale}/${display.author.username}`} className="font-semibold hover:underline">
              {display.author.name}
            </Link>
            <span className="text-muted-foreground">@{display.author.username}</span>
          </div>

          <p className="mt-1 text-sm whitespace-pre-wrap break-words leading-relaxed">
            {display.content}
          </p>

          {post.type === "QUOTE" && post.quotedPost && (
            <PostCard
              post={post.quotedPost as PostWithRelations}
              currentUserId={currentUserId}
              locale={locale}
              isQuoted
            />
          )}

          {!isQuoted && (
            <PostActions
              postId={display.id}
              initialLiked={initialLiked}
              initialRetweeted={initialRetweeted}
              likeCount={display.likes.length}
              retweetCount={display.retweets.length}
              replyCount={display.replies.length}
            />
          )}
        </div>
      </div>
    </article>
  );
}
