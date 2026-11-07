// lib/prisma/postSelect.ts
export const postInclude = {
  author: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      badge: true,
    },
  },
  quoteOf: {
    include: {
      author: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          badge: true,
          isPrivate: true,
        },
      },
    },
  },
  _count: {
    select: {
      likes: true,
      reposts: true,
      replies: true,
      quotes: true,
    },
  },
  likes: true,
  reposts: true,
  bookmarks: true,
  pinnedBy: true,
};
