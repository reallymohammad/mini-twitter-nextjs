// components/MobileBottomNav.tsx (یا components/layout/MobileBottomNav.tsx)
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Bell, Mail, User as UserIcon, Feather } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  locale: string;
  user: {
    username: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | null;
  unreadDMs?: number;
  unreadNotifications?: number;
}

export default function MobileBottomNav({
  locale,
  user,
  unreadDMs = 0,
  unreadNotifications = 0,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  // در صفحات ورود/ثبت‌نام، ایجاد توییت، یا وقتی کاربر داخل یک چت است نوار را پنهان می‌کنیم
  const isInsideChat = pathname.includes(`/${locale}/messages/`) && pathname !== `/${locale}/messages`;
  const isAuthOrCompose =
    pathname.includes("/login") ||
    pathname.includes("/signup") ||
    pathname.includes("/compose");

  if (isAuthOrCompose || isInsideChat) return null;

  const profileHref = user ? `/${locale}/${user.username}` : `/${locale}/login`;

  const navItems = [
    {
      id: "home",
      label: "Home",
      href: `/${locale}/home`,
      icon: Home,
      isActive: pathname === `/${locale}/home` || pathname === `/${locale}`,
      badge: 0,
    },
    {
      id: "explore",
      label: "Explore",
      href: `/${locale}/explore`,
      icon: Compass,
      isActive: pathname.startsWith(`/${locale}/explore`),
      badge: 0,
    },
    {
      id: "notifications",
      label: "Notifications",
      href: `/${locale}/notifications`,
      icon: Bell,
      isActive: pathname.startsWith(`/${locale}/notifications`),
      badge: unreadNotifications,
    },
    {
      id: "messages",
      label: "Messages",
      href: `/${locale}/messages`,
      icon: Mail,
      isActive: pathname.startsWith(`/${locale}/messages`),
      badge: unreadDMs,
    },
    {
      id: "profile",
      label: "Profile",
      href: profileHref,
      icon: UserIcon,
      isActive: Boolean(user && pathname.startsWith(`/${locale}/${user.username}`)),
      badge: 0,
    },
  ];

  return (
    <>
      {/* دکمه شناور ارسال توییت مخصوص موبایل */}
      {user && (
        <Link
          href={`/${locale}/compose`}
          className="md:hidden fixed bottom-20 end-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95 hover:bg-primary/90"
          aria-label="New Tweet"
        >
          <Feather className="h-6 w-6" />
        </Link>
      )}

      {/* نوار ناوبری پایین صفحه */}
      <nav className="md:hidden fixed bottom-0 start-0 end-0 z-30 flex h-16 items-center justify-around border-t border-border bg-background/85 px-1 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          const hasBadge = item.badge > 0;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 transition-colors text-muted-foreground hover:text-foreground",
                isActive && "text-primary font-semibold"
              )}
            >
              <div className="relative p-1">
                {/* نمایش بج اعلان یا پیام خوانده‌نشده */}
                {hasBadge && (
                  <span className="absolute -top-0.5 -end-1 z-10 flex min-w-4 h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white shadow-sm ring-2 ring-background animate-in zoom-in-75">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}

                {/* برای پروفایل در صورت وجود عکس، آواتار بندانگشتی نشان داده می‌شود */}
                {item.id === "profile" && user?.avatarUrl ? (
                  <div
                    className={cn(
                      "relative h-6 w-6 rounded-full overflow-hidden border border-border",
                      isActive && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    )}
                  >
                    <Image
                      src={user.avatarUrl}
                      alt={user.fullName || user.username}
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-transform",
                      isActive && "scale-110 stroke-[2.5]"
                    )}
                  />
                )}

                {isActive && (
                  <span className="absolute -bottom-1 start-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
