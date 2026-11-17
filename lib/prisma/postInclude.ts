import { Prisma } from "@prisma/client";

export function getAuthorSelect(viewerId?: string) {
  return {
    id: true,
    username: true,
    fullName: true,
    avatarUrl: true,
    badge: true,
    isPrivate: true,
    ...(viewerId
      ? {
          // بیننده، نویسنده را بلاک کرده است.
          blockedBy: {
            where: { blockerId: viewerId },
            select: { blockerId: true },
          },
          // نویسنده، بیننده را بلاک کرده است.
          blocking: {
            where: { blockedId: viewerId },
            select: { blockedId: true },
          },
          // بیننده، نویسنده را میوت کرده است.
          mutedBy: {
            where: { muterId: viewerId },
            select: { muterId: true },
          },
        }
      : {}),
  } as const satisfies Prisma.UserSelect;
}

export function getRelatedAuthorSelect(viewerId?: string) {
  return {
    ...getAuthorSelect(viewerId),
    deletedAt: true,
    followers: {
      where: {
        followerId: viewerId ?? "",
        status: "ACCEPTED" as const,
      },
      select: { followerId: true },
    },
  } as const satisfies Prisma.UserSelect;
}

type RelatedAuthor = {
  id: string;
  isPrivate: boolean;
  deletedAt: Date | null;
  followers: ReadonlyArray<{ followerId: string }>;
  blockedBy?: ReadonlyArray<{ blockerId: string }>;
  blocking?: ReadonlyArray<{ blockedId: string }>;
  mutedBy?: ReadonlyArray<{ muterId: string }>;
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

  // نویسنده، بیننده را بلاک کرده است.
  if (post.author.blocking?.length) {
    return false;
  }

  // بلاک‌کردن نویسنده توسط بیننده دسترسی به پست خصوصی نمی‌دهد؛
  // اما در صورت مجاز بودن دسترسی، UI می‌تواند Placeholder نشان دهد.
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

  if (quoteOf === post.quoteOf && replyTo === post.replyTo) {
    return post;
  }

  return { ...post, quoteOf, replyTo } as T;
}

type VisiblePostOptions = {
  // برای صفحهٔ مستقیم پست یا صفحاتی که Placeholder بلاک دارند.
  includeBlockedByViewer?: boolean;

  // برای صفحهٔ مستقیم پست یا تردی که Placeholder میوت دارد.
  includeMutedByViewer?: boolean;
};

export function getVisiblePostWhere(
  viewerId?: string,
  options: VisiblePostOptions = {}
): Prisma.PostWhereInput {
  const baseWhere: Prisma.PostWhereInput = {
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

  if (!viewerId) {
    return baseWhere;
  }

  const excludedAuthors: Prisma.PostWhereInput[] = [
    // نویسنده، بیننده را بلاک کرده است.
    {
      author: {
        is: {
          blocking: {
            some: { blockedId: viewerId },
          },
        },
      },
    },
  ];

  if (!options.includeBlockedByViewer) {
    excludedAuthors.push({
      author: {
        is: {
          blockedBy: {
            some: { blockerId: viewerId },
          },
        },
      },
    });
  }

  if (!options.includeMutedByViewer) {
    excludedAuthors.push({
      author: {
        is: {
          mutedBy: {
            some: { muterId: viewerId },
          },
        },
      },
    });
  }

  return {
    ...baseWhere,
    NOT: excludedAuthors,
  };
}

export function getPostInclude(userId?: string) {
  return {
    author: {
      select: getAuthorSelect(userId),
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
        quotes: true,
        bookmarks: true,
      },
    },
  } as const satisfies Prisma.PostInclude;
}

export default getPostInclude;
