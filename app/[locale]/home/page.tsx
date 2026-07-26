import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { locales } from "@/lib/i18n/config";
import LeftSidebar from "@/components/home/LeftSidebar";
import RightSidebar from "@/components/home/RightSidebar";
import ComposeBox from "@/components/home/ComposeBox";
import PostCard from "@/components/home/PostCard";
import MobileTabBar from "@/components/home/MobileTabBar";
import { MOCK_POSTS } from "@/lib/mock/posts";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeShell />;
}

function HomeShell() {
  const t = useTranslations("Home");

  return (
    <div className="min-h-screen flex justify-center bg-white dark:bg-neutral-950">
      <div className="flex w-full max-w-6xl">
        <LeftSidebar />

        <main className="flex-1 min-w-0 border-x border-neutral-100 dark:border-neutral-900 min-h-screen pb-16 md:pb-0">
          <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-neutral-950/80 border-b border-neutral-100 dark:border-neutral-900 px-4 py-3.5">
            <h1 className="font-bold text-lg">{t("feed")}</h1>
          </header>

          <ComposeBox />

          {MOCK_POSTS.length > 0 ? (
            MOCK_POSTS.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center gap-2">
              <p className="text-lg font-semibold">{t("emptyTitle")}</p>
              <p className="text-sm text-neutral-500 max-w-xs">
                {t("emptySubtitle")}
              </p>
            </div>
          )}
        </main>

        <RightSidebar />
      </div>

      <MobileTabBar />
    </div>
  );
}
