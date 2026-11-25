interface NotificationTabsProps {
  currentFilter: "ALL" | "MENTIONS";
  onChange: (filter: "ALL" | "MENTIONS") => void;
}

export function NotificationTabs({
  currentFilter,
  onChange,
}: NotificationTabsProps) {
  return (
    <div className="flex flex-1 border-b border-border">
      {(["ALL", "MENTIONS"] as const).map((filter) => {
        const active = currentFilter === filter;

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            className={`relative flex-1 py-3 text-center text-sm font-semibold transition hover:bg-muted/40 ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {filter === "ALL" ? "All" : "Mentions"}

            {active && (
              <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
