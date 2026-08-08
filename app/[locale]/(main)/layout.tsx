// app/[locale]/(main)/layout.tsx
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import { getCurrentUser } from "@/lib/session";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";

export default async function MainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const currentUser = await getCurrentUser();

  return (
    <CurrentUserProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto flex">
          {/* Left Sidebar */}
          <aside className="w-64 sticky top-0 h-screen overflow-y-auto border-r">
            <LeftSidebar locale={locale} user={currentUser} />
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-2xl border-r">{children}</main>

          {/* Right Sidebar */}
          <aside className="w-80 sticky top-0 h-screen overflow-y-auto hidden lg:block">
            <RightSidebar locale={locale} />
          </aside>
        </div>
      </div>
    </CurrentUserProvider>
  );
}
