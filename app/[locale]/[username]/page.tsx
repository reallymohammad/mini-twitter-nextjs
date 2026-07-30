import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { PostWithRelations } from "@/lib/types/post";

interface Props {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const postInclude = {
  author: { select: { id: true, username: true, fullName: true, avatarUrl: true, badge: true } },
  _count: { select: { likes: true, replies: true, retweets: true } },
  retweetOf: {
    include: {
      author: { select: { id: true, username: true, fullName: true, avatarUrl: true, badge: true } },
      _count: { select: { likes: true, replies: true, retweets: true } },
    },
  },
} as const;

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

  const isFollowing =
    !isOwner && currentUser
      ? !!(await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUser.id,
              followingId: profileUser.id,
            },
          },
        }))
      : false;

  let posts: PostWithRelations[] = [];

  if (tab === "posts") {
    posts = (await prisma.post.findMany({
      where: {
        authorId: profileUser.id,
        type: { in: ["POST", "RETWEET", "QUOTE"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        ...postInclude,
        likes: currentUser ? { where: { userId: currentUser.id } } : false,
      },
    })) as PostWithRelations[];
  } else if (tab === "replies") {
    posts = (await prisma.post.findMany({
      where: { authorId: profileUser.id, type: "REPLY" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        ...postInclude,
        likes: currentUser ? { where: { userId: currentUser.id } } : false,
      },
    })) as PostWithRelations[];
  } else if (tab === "likes") {
    posts = (await prisma.post.findMany({
      where: { likes: { some: { userId: profileUser.id } } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        ...postInclude,
        likes: currentUser ? { where: { userId: currentUser.id } } : false,
      },
    })) as PostWithRelations[];
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
          currentUserId={currentUser?.id}
        />
      </div>
    </main>
  );
}
