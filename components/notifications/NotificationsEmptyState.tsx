interface NotificationsEmptyStateProps {
  filter: "ALL" | "MENTIONS";
}

export function NotificationsEmptyState({
  filter,
}: NotificationsEmptyStateProps) {
  const isMentions = filter === "MENTIONS";

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <h2 className="text-xl font-bold text-foreground">
        {isMentions
          ? "Nothing to see here — yet"
          : "No notifications yet"}
      </h2>

      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {isMentions
          ? "When someone mentions you in a post, you'll find it here."
          : "From likes to reposts and a whole lot more, this is where all the action happens."}
      </p>
    </div>
  );
}
