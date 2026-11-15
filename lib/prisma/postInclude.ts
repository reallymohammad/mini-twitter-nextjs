import { Prisma } from "@prisma/client";

export const authorSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  badge: true,
  isPrivate: true,
} as const;

export function getRelatedAuthorSelect(viewerId?: string) {
  return {
    ...authorSelect,
    deletedAt: true,
    followers: {
      where: {
        followerId: viewerId ?? "",
        status: "ACCEPTED" as const,
      },
      // مدل Follow در پروژه فیلد id ندارد.
      select: { followerId: true },
    },
  } as const satisfies Prisma.UserSelect;
}

type RelatedAuthor = {
  id: string;
  isPrivate: boolean;
  deletedAt: Date | null;
  followers: ReadonlyArray<{ followerId: string }>;
};

type RelatedPost = {
  deletedAt: Date | null;
  author: RelatedAuthor;
};

function canViewRelatedPost(
  post: RelatedPost,
  viewerId?: string
): boolean {
  if (post.deletedAt || post.author.deletedAt) {
    return false;
  }

  if (!post.author.isPrivate) {
    return true;
  }

  if (viewerId === post.author.id) {
    return true;
  }

  return Boolean(
    viewerId &&
      post.author.followers.some(
        (follow) => follow.followerId === viewerId
      )
  );
}

export function sanitizePostRelations<
  T extends {
    quoteOf: RelatedPost | null;
    replyTo: RelatedPost | null;
  },
>(post: T, viewerId?: string): T {
  const quoteOf =
    post.quoteOf && canViewRelatedPost(post.quoteOf, viewerId)
      ? post.quoteOf
      : null;

  const replyTo =
    post.replyTo && canViewRelatedPost(post.replyTo, viewerId)
      ? post.replyTo
      : null;

  if (
    quoteOf === post.quoteOf &&
    replyTo === post.replyTo
  ) {
    return post;
  }

  // شناسه‌های quoteOfId و replyToId روی پست اصلی باقی می‌مانند
  // تا UI بتواند وضعیت «در دسترس نیست» را نمایش دهد.
  return { ...post, quoteOf, replyTo } as T;
}


export function getVisiblePostWhere(
  viewerId?: string
): Prisma.PostWhereInput {
  return {
    deletedAt: null,
    author: {
      is: { deletedAt: null },
    },
    OR: [
      { author: { is: { isPrivate: false } } },
      ...(viewerId
        ? [
            { authorId: viewerId },
            {
              author: {
                is: {
                  followers: {
                    some: {
                      followerId: viewerId,
                      status: "ACCEPTED" as const,
                    },
                  },
                },
              },
            },
          ]
        : []),
    ],
  };
}


export function getPostInclude(userId?: string) {
  return {
    author: {
      select: authorSelect,
    },

    likes: userId
      ? {
          where: { userId },
          select: { userId: true },
        }
      : false,

    reposts: userId
      ? {
          where: { userId },
          select: { userId: true },
        }
      : false,

    pinnedBy: userId
      ? {
          where: { userId },
          select: {
            userId: true,
            order: true,
          },
        }
      : false,

    quoteOf: {
      include: {
        author: {
          select: getRelatedAuthorSelect(userId),
        },
        _count: {
          select: {
            likes: true,
            replies: true,
            reposts: true,
            quotes: true,
          },
        },
      },
    },

    replyTo: {
      select: {
        id: true,
        content: true,
        deletedAt: true,
        author: {
          select: getRelatedAuthorSelect(userId),
        },
      },
    },

    _count: {
      select: {
        likes: true,
        replies: true,
        reposts: true,
        quotes: true,
        bookmarks: true,
      },
    },
  } as const satisfies Prisma.PostInclude;
}

export default getPostInclude;
