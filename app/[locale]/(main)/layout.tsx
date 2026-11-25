// app/[locale]/(main)/layout.tsx
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCurrentUser } from "@/lib/session";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { getUnreadMessagesCount } from "@/lib/dm/queries";
import { getUnreadNotificationsCount } from "@/lib/notifications/actions";

export default async function MainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // واکشی موازی اطلاعات کاربر، پیام‌های خوانده‌نشده و اعلان‌های خوانده‌نشده
  const [currentUser, unreadDMs, unreadNotifications] = await Promise.all([
    getCurrentUser(),
    getUnreadMessagesCount(),
    getUnreadNotificationsCount(),
  ]);

  return (
    <CurrentUserProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto flex">
          {/* Left Sidebar - دقیقاً اندازه قبلی w-64 */}
          <aside className="w-64 sticky top-0 h-screen overflow-y-auto border-r hidden md:block">
            <LeftSidebar 
              locale={locale} 
              user={currentUser} 
              unreadDMs={unreadDMs} 
              unreadNotifications={unreadNotifications}
            />
          </aside>

          {/* Main Content - با فضا برای منوی موبایل */}
          <main className="flex-1 max-w-2xl border-r pb-16 md:pb-0">
            {children}
          </main>

          {/* Right Sidebar - دقیقاً اندازه قبلی w-80 */}
          <aside className="w-80 sticky top-0 h-screen overflow-y-auto hidden lg:block">
            <RightSidebar locale={locale} />
          </aside>
        </div>

        {/* نوار ناوبری پایین صفحه برای موبایل */}
        <MobileBottomNav 
          locale={locale} 
          user={currentUser} 
          unreadDMs={unreadDMs} 
          unreadNotifications={unreadNotifications}
        />
      </div>
    </CurrentUserProvider>
  );
}
