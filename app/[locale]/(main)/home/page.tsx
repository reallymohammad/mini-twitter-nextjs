import { redirect } from "next/navigation";

import FeedTabs from "@/components/feed/FeedTabs";
import { getCurrentUser } from "@/lib/session";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen">
      <FeedTabs currentUserId={currentUser.id} />
    </main>
  );
}
