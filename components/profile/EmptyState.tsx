// components/profile/EmptyState.tsx
export default function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, string> = {
    posts: "No posts yet.",
    replies: "No replies yet.",
    media: "No media yet.",
    likes: "No likes yet.",
  };

  return (
    <div className="py-16 text-center text-sm text-muted-foreground">
      {messages[tab] ?? "Nothing here yet."}
    </div>
  );
}
