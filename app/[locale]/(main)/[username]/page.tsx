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

const authorSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  badge: true,
} as const;

// جایگزین const postInclude = { ... } با این:
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
  } as const;
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

  // فقط Follow تأییدشده
  const isFollowing = follow?.status === "ACCEPTED";

  // برای نمایش حالت «درخواست ارسال شده» در حساب private
  const isFollowPending = follow?.status === "PENDING";

  

 let posts: PostWithRelations[] = [];

if (tab === "posts") {
  posts = (await prisma.post.findMany({
    where: { authorId: profileUser.id, deletedAt: null, replyToId: null },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: getPostInclude(currentUser?.id),
  })) as PostWithRelations[];
} else if (tab === "replies") {
  posts = (await prisma.post.findMany({
    where: { authorId: profileUser.id, deletedAt: null, replyToId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: getPostInclude(currentUser?.id),
  })) as PostWithRelations[];
} else if (tab === "likes") {
  posts = (await prisma.post.findMany({
    where: { deletedAt: null, likes: { some: { userId: profileUser.id } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: getPostInclude(currentUser?.id),
  })) as PostWithRelations[];
} else if (tab === "reposts") {
  posts = (await prisma.post.findMany({
    where: { deletedAt: null, reposts: { some: { userId: profileUser.id } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: getPostInclude(currentUser?.id),
  })) as PostWithRelations[];
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
        posts={posts}
        currentUserId={currentUser?.id}
      />
    </>
  );
}
