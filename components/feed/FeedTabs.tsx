"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

import PostCard from "@/components/post/PostCard";
import type { PostWithRelations } from "@/lib/types/post";

type Tab = "foryou" | "following";

type FeedPost = PostWithRelations & {
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  quoteCount?: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
};

export default function FeedTabs({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>("foryou");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const controllerRef = useRef<AbortController | null>(null);
  const activeTabRef = useRef<Tab>(tab);
  const locale = useLocale();

  // برای callbackهایی که از کارت‌های فید می‌آیند،
  // همیشه تب فعلی را در نظر می‌گیریم، نه تب قدیمی را.
  activeTabRef.current = tab;

  const loadPosts = useCallback(
    async ({
      showLoading = false,
      feedType = activeTabRef.current,
    }: {
      showLoading?: boolean;
      feedType?: Tab;
    } = {}) => {
      controllerRef.current?.abort();

      const controller = new AbortController();
      controllerRef.current = controller;

      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetch(
          `/api/posts/feed?type=${feedType}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          const text = await response.text();

          throw new Error(
            `Feed fetch failed: ${response.status} ${text}`
          );
        }

        const data: unknown = await response.json();

        if (!controller.signal.aborted) {
          setPosts(
            Array.isArray(data) ? (data as FeedPost[]) : []
          );
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Feed fetch error:", error);

        // هنگام واکشی اولیه، خطا به فید خالی منجر می‌شود.
        // در واکشی پس از تعامل، محتوای فعلی را حفظ می‌کنیم.
        if (showLoading) {
          setPosts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }

        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadPosts({
      showLoading: true,
      feedType: tab,
    });

    return () => {
      const controller = controllerRef.current;

      controller?.abort();

      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [tab, loadPosts]);

  return (
    <div>
      <div className="sticky top-0 z-10 flex border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
        {(["foryou", "following"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`relative flex-1 py-3 text-sm font-medium transition-colors ${
              tab === item
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {item === "foryou" ? "For You" : "Following"}

            {tab === item && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-sky-500" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonPost key={index} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-400">
          {tab === "following"
            ? "کسی که فالو کردی پستی نداره."
            : "پستی وجود نداره."}
        </p>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              locale={locale}
              onPostChanged={() => {
                void loadPosts({
                  feedType: activeTabRef.current,
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonPost() {
  return (
    <div className="flex animate-pulse gap-3 p-4">
      <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800" />

      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 w-1/4 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
