// components/layout/LeftSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  User,
  Bookmark,
  MoreHorizontal,
  Feather,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface LeftSidebarProps {
  locale: string;
  user: { username: string; avatarUrl?: string | null } | null;
}

export default function LeftSidebar({ locale, user }: LeftSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: `/${locale}/home`,
    },
    {
      icon: Compass,
      label: "Explore",
      href: `/${locale}/explore`,
    },
    {
      icon: User,
      label: "Profile",
      href: user ? `/${locale}/${user.username}` : `/${locale}/login`,
    },
    {
      icon: Bookmark,
      label: "Bookmarks",
      href: `/${locale}/bookmarks`,
    },
    {
      icon: MoreHorizontal,
      label: "More",
      href: `/${locale}/more`,
    },
  ];

  return (
    <div className="flex flex-col h-full p-4 space-y-2">
      {/* Logo */}
      <div className="mb-4 p-3">
        <Link href={`/${locale}`}>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Feather className="w-5 h-5 text-primary-foreground" />
          </div>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-full transition-colors hover:bg-accent",
                isActive && "font-bold"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xl">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Tweet Button */}
      <Button
        size="lg"
        className="w-full rounded-full text-lg font-bold"
        
      >
        <Link href={`/${locale}/compose`}>Tweet</Link>
      </Button>

      {/* User Profile */}
      {user && (
        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center gap-3 p-3 rounded-full hover:bg-accent cursor-pointer">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">@{user.username}</p>
            </div>
            <MoreHorizontal className="w-5 h-5" />
          </div>
        </div>
      )}
    </div>
  );
}
