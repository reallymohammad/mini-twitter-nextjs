import type { NotificationFilter } from "./types";

interface NotificationTabsProps {
  currentFilter: NotificationFilter;
  onChange: (filter: NotificationFilter) => void;
}

const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "VERIFIED", label: "Verified" },
  { value: "MENTIONS", label: "Mentions" },
];

export function NotificationTabs({
  currentFilter,
  onChange,
}: NotificationTabsProps) {
  return (
    <div className="flex flex-1 border-b border-border">
      {FILTERS.map(({ value, label }) => {
        const active = currentFilter === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            className={`relative flex-1 py-3 text-center text-sm font-semibold transition hover:bg-muted/40 ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {label}

            {active && (
              <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
