export default function TrendCard({
  tag,
  posts,
}: {
  tag: string;
  posts: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
      <div>
        <p className="font-semibold text-sm">{tag}</p>
        <p className="text-xs text-neutral-500">{posts} posts</p>
      </div>
    </div>
  );
}
