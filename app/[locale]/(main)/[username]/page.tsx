import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import {
  getRelatedAuthorSelect,
  getVisiblePostWhere,
  sanitizePostRelations,
} from "@/lib/prisma/postInclude";
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
  isPrivate: true,
} as const;

const getPostInclude = (currentUserId?: string) => {
  const userFilter = currentUserId
    ? ({
        where: { userId: currentUserId },
        select: { userId: true },
      } as const)
    : false;

  return {
    author: {
      select: authorSelect,
    },

    _count: {
      select: {
        likes: true,
        replies: {
          where: { deletedAt: null },
        },
        reposts: true,
        bookmarks: true,
        quotes: {
          where: { deletedAt: null },
        },
      },
    },

    pinnedBy: {
      select: {
        userId: true,
        order: true,
      },
    },

    replyTo: {
      select: {
        id: true,
        content: true,
        deletedAt: true,
        author: {
          select: getRelatedAuthorSelect(currentUserId),
        },
      },
    },

    quoteOf: {
      include: {
        author: {
          select: getRelatedAuthorSelect(currentUserId),
        },
        likes: userFilter,
        bookmarks: userFilter,
        reposts: userFilter,
        _count: {
          select: {
            likes: true,
            replies: {
              where: { deletedAt: null },
            },
            reposts: true,
            quotes: {
              where: { deletedAt: null },
            },
          },
        },
      },
    },

    likes: userFilter,
    bookmarks: userFilter,
    reposts: userFilter,
  } as const satisfies Prisma.PostInclude;
};

type PostPayload = Prisma.PostGetPayload<{
  include: ReturnType<typeof getPostInclude>;
}>;

type FeedItem = PostPayload & {
  repostedByName?: string;
  timelineDate: Date;
  isPinnedProfile?: boolean;
};

export default async function ProfilePage({
  params,
  searchParams,
}: Props) {
  const { username, locale } = await params;
  const { tab = "posts" } = await searchParams;

  const [profileUser, currentUser, t] = await Promise.all([
    prisma.user.findFirst({
      where: {
        username,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            followers: {
              where: { status: "ACCEPTED" },
            },
            following: {
              where: { status: "ACCEPTED" },
            },
            posts: {
              where: { deletedAt: null },
            },
          },
        },
      },
    }),
    getCurrentUser(),
    getTranslations({ locale, namespace: "profile" }),
  ]);

  if (!profileUser) notFound();

  const isOwner = currentUser?.id === profileUser.id;
  const displayName = isOwner
    ? "You"
    : profileUser.fullName || profileUser.username;

  const follow =
    !isOwner && currentUser
      ? await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUser.id,
              followingId: profileUser.id,
            },
          },
          select: { status: true },
        })
      : null;

  const followStatus = follow?.status ?? null;
  const isFollowing = followStatus === "ACCEPTED";
  const canViewContent =
    isOwner || !profileUser.isPrivate || isFollowing;

  let posts: FeedItem[] = [];

  if (canViewContent) {
    const visiblePost = getVisiblePostWhere(currentUser?.id);
    const postInclude = getPostInclude(currentUser?.id);

    if (tab === "posts") {
      const [pinnedRecords, userPosts, userReposts] =
        await Promise.all([
          prisma.pinnedPost.findMany({
            where: {
              userId: profileUser.id,
              post: {
                is: {
                  deletedAt: null,
                  ...visiblePost,
                },
              },
            },
            orderBy: { order: "asc" },
            include: {
              post: {
                include: postInclude,
              },
            },
          }),

          prisma.post.findMany({
            where: {
              authorId: profileUser.id,
              deletedAt: null,
              replyToId: null,
              ...visiblePost,
            },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: postInclude,
          }),

          prisma.repost.findMany({
            where: {
              userId: profileUser.id,
              post: {
                is: {
                  deletedAt: null,
                  ...visiblePost,
                  author: { is: { isPrivate: false } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
              post: {
                include: postInclude,
              },
            },
          }),
        ]);

      const pinnedItems: FeedItem[] = pinnedRecords
        .filter(
          (record) =>
            record.post && record.post.deletedAt === null
        )
        .map((record) => ({
          ...record.post,
          timelineDate: record.createdAt,
          isPinnedProfile: true,
        }));

      const pinnedPostIds = new Set(
        pinnedItems.map((post) => post.id)
      );

      const normalItems: FeedItem[] = [
        ...userPosts
          .filter((post) => !pinnedPostIds.has(post.id))
          .map((post) => ({
            ...post,
            timelineDate: post.createdAt,
          })),

        ...userReposts
          .filter(
            (repost) =>
              repost.post &&
              repost.post.deletedAt === null &&
              !pinnedPostIds.has(repost.postId)
          )
          .map((repost) => ({
            ...repost.post,
            repostedByName: displayName,
            timelineDate: repost.createdAt,
          })),
      ].sort(
        (a, b) =>
          b.timelineDate.getTime() - a.timelineDate.getTime()
      );

      posts = [...pinnedItems, ...normalItems].slice(0, 20);
    } else if (tab === "replies") {
      const data = await prisma.post.findMany({
        where: {
          authorId: profileUser.id,
          deletedAt: null,
          replyToId: { not: null },
          ...visiblePost,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: postInclude,
      });

      posts = data.map((post) => ({
        ...post,
        timelineDate: post.createdAt,
      }));
    } else if (tab === "likes") {
      const data = await prisma.post.findMany({
        where: {
          deletedAt: null,
          likes: {
            some: { userId: profileUser.id },
          },
          ...visiblePost,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: postInclude,
      });

      posts = data.map((post) => ({
        ...post,
        timelineDate: post.createdAt,
      }));
    } else if (tab === "reposts") {
      const data = await prisma.repost.findMany({
        where: {
          userId: profileUser.id,
          post: {
            is: {
              deletedAt: null,
              ...visiblePost,
              author: { is: { isPrivate: false } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          post: {
            include: postInclude,
          },
        },
      });

      posts = data
        .filter(
          (repost) =>
            repost.post && repost.post.deletedAt === null
        )
        .map((repost) => ({
          ...repost.post,
          repostedByName: displayName,
          timelineDate: repost.createdAt,
        }));
    }

    posts = posts.map((post) => {
      const safe = sanitizePostRelations(post, currentUser?.id);
      const counts = safe._count;

      return {
        ...safe,
        likeCount: counts.likes,
        replyCount: counts.replies,
        repostCount: counts.reposts,
        quoteCount: counts.quotes,
      };
    });
  }

  return (
    <>
      <ProfileHeader
        user={profileUser}
        counts={profileUser._count}
        isOwner={isOwner}
        followStatus={followStatus}
        currentUserId={currentUser?.id}
        locale={locale}
      />

      {canViewContent ? (
        <ProfileTabs
          username={username}
          locale={locale}
          activeTab={tab}
          posts={posts as any}
          currentUserId={currentUser?.id}
        />
      ) : (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center border-t border-border px-4 py-16 text-center">
          <div className="mb-4 rounded-full border border-border bg-muted p-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {t("privateNoticeTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("privateNoticeDesc")}
          </p>
        </div>
      )}
    </>
  );
}
