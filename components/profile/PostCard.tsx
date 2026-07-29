// components/profile/PostCard.tsx
import { Heart } from "lucide-react";

interface Props {
  post: {
    id: string;
    content: string;
    createdAt: Date;
    _count: { likes: number };
  };
}

export default function PostCard({ post }: Props) {
  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <article className="px-4 py-4 hover:bg-muted/30 transition-colors">
      <p className="text-sm leading-relaxed mb-2">{post.content}</p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{date}</span>
        <span className="flex items-center gap-1">
          <Heart size={12} /> {post._count.likes}
        </span>
      </div>
    </article>
  );
}
