// app/[locale]/(main)/home/page.tsx
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import FeedTabs from "@/components/feed/FeedTabs";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return (
    <main className="min-h-screen">
      <FeedTabs currentUser={currentUser}  />
    </main>
  );
}
