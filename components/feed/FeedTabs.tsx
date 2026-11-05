"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import PostCard from "@/components/post/PostCard";

type Tab = "foryou" | "following";

export default function FeedTabs({ currentUser }: { currentUser: any }) {
  const [tab, setTab] = useState<Tab>("foryou");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = useLocale();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/posts/feed?type=${tab}`)
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text();
          console.error("Feed fetch failed:", r.status, text);
          return [];
        }
        const text = await r.text();
        return text ? JSON.parse(text) : [];
      })
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Feed fetch error:", err);
        setPosts([]);
        setLoading(false);
      });
  }, [tab]);

  return (
    <div>
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur z-10">
        {(["foryou", "following"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative
              ${tab === t
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
          >
            {t === "foryou" ? "For You" : "Following"}
            {tab === t && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-sky-500" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonPost key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-neutral-400 py-16 text-sm">
          {tab === "following" ? "کسی که فالو کردی پستی نداره." : "پستی وجود نداره."}
        </p>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUser?.id}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonPost() {
  return (
    <div className="p-4 flex gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 w-1/4 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
