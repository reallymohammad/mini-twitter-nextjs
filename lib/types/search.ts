// types/search.ts

export interface SearchUser {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  badge?: string;
  isFollowedByViewer?: boolean;
}

export interface SearchPost {
  id: string;
  content: string;
  mediaUrls: string[];
  createdAt: string;
  type: string;
  author: SearchUser;
  counts: {
    likes: number;
    reposts: number;
    replies: number;
    bookmarks: number;
  };
  viewer: {
    isLiked: boolean;
    isReposted: boolean;
    isBookmarked: boolean;
  };
  rank?: number;
}

export interface SearchResponse {
  posts: {
    items: SearchPost[];
    nextCursor: string | null;
  };
  users: {
    items: SearchUser[];
    hasMore: boolean;
  };
}
