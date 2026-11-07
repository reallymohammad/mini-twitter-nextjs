import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";

interface Props {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const authorSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  badge: true,
} as const;

const getPostInclude = (userId?: string) => {
  const userFilter = userId
    ? { where: { userId }, select: { userId: true } }
    : false;

  return {
    author: { select: authorSelect },
    _count: {
      select: {
        likes: true,
        replies: true,
        reposts: true,
        bookmarks: true,
        quotes: true,
      },
    },
    pinnedBy: { select: { userId: true, order: true } },
    replyTo: {
      select: { id: true, content: true, author: { select: authorSelect } },
    },
    quoteOf: {
      include: {
        author: { select: authorSelect },
        likes: userFilter,
        bookmarks: userFilter,
        reposts: userFilter,
        _count: {
          select: { likes: true, replies: true, reposts: true, quotes: true },
        },
      },
    },
    likes: userFilter,
    bookmarks: userFilter,
    reposts: userFilter,
  };
};

type PostPayload = Prisma.PostGetPayload<{
  include: ReturnType<typeof getPostInclude>;
}>;

type FeedItem = PostPayload & {
  repostedByName?: string;
  timelineDate: Date;
};

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username, locale } = await params;
  const { tab = "posts" } = await searchParams;

  const [profileUser, currentUser] = await Promise.all([
    prisma.user.findFirst({
      where: {
        username,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            followers: {
              where: {
                status: "ACCEPTED",
              },
            },
            following: {
              where: {
                status: "ACCEPTED",
              },
            },
            posts: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!profileUser) notFound();

  const isOwner = currentUser?.id === profileUser.id;
  const displayName = isOwner ? "You" : profileUser.fullName || profileUser.username;

  const follow = !isOwner && currentUser
    ? await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: profileUser.id,
          },
        },
        select: {
          status: true,
        },
      })
    : null;

  const isFollowing = follow?.status === "ACCEPTED";

  let posts: FeedItem[] = [];

  if (tab === "posts") {
    const [userPosts, userReposts] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: profileUser.id, deletedAt: null, replyToId: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: getPostInclude(currentUser?.id),
      }),
      prisma.repost.findMany({
        where: { userId: profileUser.id, post: { deletedAt: null } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { post: { include: getPostInclude(currentUser?.id) } },
      }),
    ]);

    const allItems: FeedItem[] = [
      ...userPosts.map((p) => ({ ...p, timelineDate: p.createdAt })),
      ...userReposts.map((r) => ({
        ...(r.post as PostPayload),
        repostedByName: displayName,
        timelineDate: r.createdAt,
      })),
    ].sort((a, b) => b.timelineDate.getTime() - a.timelineDate.getTime());

    posts = allItems.slice(0, 20);
  } else if (tab === "replies") {
    const data = await prisma.post.findMany({
      where: { authorId: profileUser.id, deletedAt: null, replyToId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: getPostInclude(currentUser?.id),
    });
    posts = data.map((p) => ({ ...p, timelineDate: p.createdAt }));
  } else if (tab === "likes") {
    const data = await prisma.post.findMany({
      where: { deletedAt: null, likes: { some: { userId: profileUser.id } } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: getPostInclude(currentUser?.id),
    });
    posts = data.map((p) => ({ ...p, timelineDate: p.createdAt }));
  } else if (tab === "reposts") {
    const data = await prisma.repost.findMany({
      where: { userId: profileUser.id, post: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { post: { include: getPostInclude(currentUser?.id) } },
    });
    posts = data.map((r) => ({
      ...(r.post as PostPayload),
      repostedByName: displayName,
      timelineDate: r.createdAt,
    }));
  }

  return (
    <>
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
        posts={posts as any}
        currentUserId={currentUser?.id}
      />
    </>
  );
}
