import Avatar from "@/components/ui/Avatar";
import { MockPost } from "@/lib/mock/posts";
import { Heart, MessageCircle, Repeat2, Share } from "lucide-react";

export default function PostCard({ post }: { post: MockPost }) {
  return (
    <article className="flex gap-3 px-4 py-4 border-b border-neutral-100 dark:border-neutral-900 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors cursor-pointer">
      <Avatar name={post.name} gradient={post.avatarColor} size={44} />

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="font-bold truncate">{post.name}</span>
          <span className="text-neutral-500 truncate">{post.handle}</span>
          <span className="text-neutral-400">·</span>
          <span className="text-neutral-400 shrink-0">{post.time}</span>
        </div>

        <p className="text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200">
          {post.content}
        </p>

        <div className="flex items-center justify-between max-w-md mt-2 -ms-2">
          <button className="flex items-center gap-1.5 text-neutral-500 hover:text-violet-500 group px-2 py-1.5 rounded-full hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
            <MessageCircle className="w-[18px] h-[18px]" />
            <span className="text-xs">{post.comments}</span>
          </button>
          <button className="flex items-center gap-1.5 text-neutral-500 hover:text-emerald-500 px-2 py-1.5 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
            <Repeat2 className="w-[18px] h-[18px]" />
            <span className="text-xs">{post.reposts}</span>
          </button>
          <button className="flex items-center gap-1.5 text-neutral-500 hover:text-rose-500 px-2 py-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
            <Heart className="w-[18px] h-[18px]" />
            <span className="text-xs">{post.likes}</span>
          </button>
          <button className="flex items-center text-neutral-500 hover:text-violet-500 px-2 py-1.5 rounded-full hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
            <Share className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </article>
  );
}
