"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Bell,
  User,
  Bookmark,
  Feather,
  Mail,
  Settings,
} from "lucide-react";
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
  unreadNotifications?: number;
}

export default function LeftSidebar({
  locale,
  user,
  unreadDMs = 0,
  unreadNotifications = 0,
}: LeftSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { 
      icon: Home, 
      label: "Home", 
      href: `/${locale}/home`, 
      badge: 0 
    },
    { 
      icon: Compass, 
      label: "Explore", 
      href: `/${locale}/explore`, 
      badge: 0 
    },
    {
      icon: Bell,
      label: "Notifications",
      href: user ? `/${locale}/notifications` : `/${locale}/login`,
      badge: unreadNotifications,
    },
    {
      icon: Mail,
      label: "Messages",
      href: user ? `/${locale}/messages` : `/${locale}/login`,
      badge: unreadDMs,
    },
    {
      icon: Bookmark,
      label: "Bookmarks",
      href: `/${locale}/bookmarks`,
      badge: 0,
    },
    {
      icon: User,
      label: "Profile",
      href: user ? `/${locale}/${user.username}` : `/${locale}/login`,
      badge: 0,
    },
  ];

  const settingsHref = `/${locale}/settings`;
  const isSettingsActive =
    pathname === settingsHref || pathname.startsWith(`${settingsHref}/`);

  return (
    <aside className="sticky top-0 hidden max-h-screen h-full flex-col space-y-2 p-3 md:flex lg:p-4">
      <div className="mb-2 p-3">
        <Link href={`/${locale}/home`} className="inline-block">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition hover:bg-primary/20">
            <Feather className="h-6 w-6 text-primary" />
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.label === "Notifications" &&
              pathname.startsWith(`/${locale}/notifications`)) ||
            (item.label === "Messages" &&
              pathname.startsWith(`/${locale}/messages`));
          const hasBadge = Boolean(item.badge && item.badge > 0);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-4 rounded-full px-4 py-3 text-neutral-300 transition-colors hover:bg-accent/80 hover:text-white",
                isActive && "bg-accent/40 font-bold text-white"
              )}
            >
              <div className="relative flex shrink-0 items-center justify-center">
                <Icon className="h-6 w-6" />

                {hasBadge && (
                  <span className="absolute -right-2 -top-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow ring-2 ring-background animate-in zoom-in-75">
                    {item.badge && item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>

              <span className="hidden text-xl lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-0 my-2">
        <Link
          href={`/${locale}/compose`}
          className="flex w-full items-center justify-center rounded-full bg-primary py-3 text-base font-bold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 lg:text-lg"
        >
          <span className="hidden lg:inline">Tweet</span>
          <Feather className="h-5 w-5 lg:hidden" />
        </Link>
      </div>

      {user && (
        <div className="space-y-2 border-t border-border pt-3">
          <Link
            href={settingsHref}
            aria-current={isSettingsActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-4 rounded-full px-4 py-3 text-neutral-300 transition-colors hover:bg-accent/80 hover:text-white",
              isSettingsActive && "bg-accent/40 font-bold text-white"
            )}
          >
            <Settings className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span className="hidden text-xl lg:inline">Settings</span>
          </Link>

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
