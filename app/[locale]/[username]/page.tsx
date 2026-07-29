// app/[locale]/[username]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";

interface Props {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username, locale } = await params;
  const { tab = "posts" } = await searchParams;

  const [profileUser, currentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      include: {
        _count: { select: { followers: true, following: true, posts: true } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!profileUser) notFound();

  const isOwner = currentUser?.id === profileUser.id;

  const isFollowing = !isOwner && currentUser
    ? !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUser.id, followingId: profileUser.id } },
      }))
    : false;

  let posts: { id: string; content: string; createdAt: Date; _count: { likes: number } }[] = [];

  if (tab === "posts") {
    posts = await prisma.post.findMany({
      where: { authorId: profileUser.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { likes: true } } },
    });
  } else if (tab === "likes" && currentUser) {
    posts = await prisma.post.findMany({
      where: { likes: { some: { userId: profileUser.id } } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { likes: true } } },
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        <ProfileHeader
          user={profileUser}
          counts={profileUser._count}
          isOwner={isOwner}
          isFollowing={isFollowing}
          currentUserId={currentUser?.id}
          locale={locale}
        />
        <ProfileTabs
          username={username}
          locale={locale}
          activeTab={tab}
          posts={posts}
        />
      </div>
    </main>
  );
}
