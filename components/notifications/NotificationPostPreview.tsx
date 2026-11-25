interface NotificationPostPreviewProps {
  content: string | null;
}

export function NotificationPostPreview({
  content,
}: NotificationPostPreviewProps) {
  return (
    <div className="mt-2 rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
      <p className="line-clamp-2">
        {content || "View post"}
      </p>
    </div>
  );
}
