"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { PostWithRelations } from "@/types/post";
import PostActions from "./PostActions";

interface Props {
  post: PostWithRelations;
  currentUserId: string;
  onUpdate: (post: PostWithRelations) => void;
  onNewPost: (post: PostWithRelations) => void;
  isQuoted?: boolean;
}

export default function PostCard({ post, currentUserId, onUpdate, onNewPost, isQuoted }: Props) {
  const { locale } = useParams<{ locale: string }>();

  const displayPost =
    post.type === "RETWEET" && post.originalPost ? post.originalPost : post;

  return (
    <article className={`px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors ${isQuoted ? "border rounded-xl mt-2" : ""}`}>
      {post.type === "RETWEET" && (
        <p className="text-xs text-muted-foreground mb-1 ml-10">
          🔁 {post.author.name} retweeted
        </p>
      )}

      <div className="flex gap-3">
        <Link href={`/${locale}/${displayPost.author.username}`} className="shrink-0">
          {displayPost.author.avatarUrl ? (
            <Image
              src={displayPost.author.avatarUrl}
              alt={displayPost.author.name ?? ""}
              width={40}
              height={40}
              className="rounded-full w-10 h-10 object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted" />
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Link
              href={`/${locale}/${displayPost.author.username}`}
              className="font-semibold hover:underline truncate"
            >
              {displayPost.author.name}
            </Link>
            <span className="text-muted-foreground text-sm">
              @{displayPost.author.username}
            </span>
          </div>

          <p className="mt-1 text-sm whitespace-pre-wrap break-words">{displayPost.content}</p>

          {/* Quoted post */}
          {post.type === "QUOTE" && post.quotedPost && (
            <PostCard
              post={post.quotedPost}
              currentUserId={currentUserId}
              onUpdate={onUpdate}
              onNewPost={onNewPost}
              isQuoted
            />
          )}

          {!isQuoted && (
            <PostActions
              post={displayPost}
              currentUserId={currentUserId}
              onUpdate={onUpdate}
              onNewPost={onNewPost}
            />
          )}
        </div>
      </div>
    </article>
  );
}
