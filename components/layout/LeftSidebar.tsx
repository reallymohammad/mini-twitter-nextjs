"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, User, Bookmark, Feather, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenuWrapper from "./UserMenuWrapper";

interface LeftSidebarProps {
  locale: string;
  user: {
    username: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | null;
  unreadDMs?: number;
}

export default function LeftSidebar({
  locale,
  user,
  unreadDMs = 0,
}: LeftSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: "Home", href: `/${locale}/home`, badge: 0 },
    { icon: Compass, label: "Explore", href: `/${locale}/explore`, badge: 0 },
    {
      icon: Mail,
      label: "Messages",
      href: user ? `/${locale}/messages` : `/${locale}/login`,
      badge: unreadDMs,
    },
    { icon: Bookmark, label: "Bookmarks", href: `/${locale}/bookmarks`, badge: 0 },
    {
      icon: User,
      label: "Profile",
      href: user ? `/${locale}/${user.username}` : `/${locale}/login`,
      badge: 0,
    },
  ];

  return (
    // مخفی در موبایل (hidden) و نمایش از سایز md به بالا (md:flex)
    <aside className="hidden md:flex flex-col h-full p-3 lg:p-4 space-y-2 sticky top-0 max-h-screen">
      <div className="mb-2 p-3">
        <Link href={`/${locale}/home`} className="inline-block">
          <div className="w-10 h-10 bg-primary/10 hover:bg-primary/20 rounded-full flex items-center justify-center transition">
            <Feather className="w-6 h-6 text-primary" />
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.label === "Messages" &&
              pathname.startsWith(`/${locale}/messages`));
          const hasBadge = Boolean(item.badge && item.badge > 0);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-full transition-colors hover:bg-accent/80 text-neutral-300 hover:text-white",
                isActive && "font-bold text-white bg-accent/40"
              )}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <Icon className="w-6 h-6" />

                {/* بج نشانگر پیام‌های خوانده‌نشده */}
                {hasBadge && (
                  <span className="absolute -top-1.5 -right-2 z-10 flex min-w-4 h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow ring-2 ring-background animate-in zoom-in-75">
                    {item.badge && item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>

              <span className="text-xl hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-0 my-2">
        <Link
          href={`/${locale}/compose`}
          className="flex items-center justify-center w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-base lg:text-lg shadow-md hover:bg-primary/90 transition-colors"
        >
          <span className="hidden lg:inline">Tweet</span>
          <Feather className="w-5 h-5 lg:hidden" />
        </Link>
      </div>

      {user && (
        <div className="pt-2">
          <UserMenuWrapper
            initialUser={{
              username: user.username,
              avatarUrl: user.avatarUrl,
              fullName: user.fullName ?? user.username,
            }}
          />
        </div>
      )}
    </aside>
  );
}
