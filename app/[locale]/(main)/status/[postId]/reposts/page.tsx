import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import FollowButton from "@/components/user/FollowButton";

interface Props {
  params: Promise<{ locale: string; postId: string }>;
}

export default async function RepostsPage({ params }: Props) {
  const { locale, postId } = await params;
  const currentUser = await getCurrentUser();

  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true },
  });

  if (!post) notFound();

  const reposts = await prisma.repost.findMany({
    where: { postId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
        },
      },
    },
  });

  // استخراج لیست کاربرانی که کاربر جاری آن‌ها را فالو کرده است
  let followingIds = new Set<string>();
  if (currentUser) {
    const follows = await prisma.follow.findMany({
      where: {
        followerId: currentUser.id,
        followingId: { in: reposts.map((r) => r.user.id) },
      },
      select: { followingId: true },
    });
    followingIds = new Set(follows.map((f) => f.followingId));
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl border-x border-border">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <Link
          href={`/${locale}/status/${postId}`}
          className="-ml-2 rounded-full p-2 transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Reposted by</h1>
        </div>
      </div>

      {/* Users List */}
      <div className="divide-y divide-border">
        {reposts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No reposts yet.
          </p>
        ) : (
          reposts.map(({ user }) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
            >
              <Link
                href={`/${locale}/${user.username}`}
                className="flex flex-1 items-start gap-3 min-w-0 pr-2"
              >
                {/* Avatar */}
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.fullName || user.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold hover:underline">
                    {user.fullName || user.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{user.username}
                  </p>
                  {user.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-foreground/90">
                      {user.bio}
                    </p>
                  )}
                </div>
              </Link>

              <FollowButton
                targetUserId={user.id}
                initialIsFollowing={followingIds.has(user.id)}
                currentUserId={currentUser?.id}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
