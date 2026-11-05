"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchTabsProps {
  locale: string;
  query: string;
}

const tabs = [
  { key: "top", label: "Top" },
  { key: "latest", label: "Latest" },
  { key: "people", label: "People" },
];

export function SearchTabs({ locale, query }: SearchTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "top";

  return (
    <div className="grid grid-cols-3 border-b">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Link
            key={tab.key}
            href={`/${locale}/search?q=${encodeURIComponent(query)}&tab=${tab.key}`}
            className={cn(
              "relative px-4 py-4 text-center text-sm font-semibold",
              "text-muted-foreground hover:bg-accent/50",
              isActive && "text-foreground"
            )}
          >
            {tab.label}

            {isActive && (
              <span className="absolute inset-x-8 bottom-0 h-1 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
