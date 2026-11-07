import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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
          badge: true,
          isPrivate: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen border-x border-border max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-6 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <Link
          href={`/${locale}/status/${postId}`}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Reposted by</h1>
        </div>
      </div>

      {/* Users List */}
      <div className="divide-y border-border">
        {reposts.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">
            No reposts yet.
          </p>
        ) : (
          reposts.map(({ user }) => (
            <div
              key={user.id}
              className="flex items-start justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <Link
                href={`/${locale}/${user.username}`}
                className="flex gap-3 flex-1 min-w-0"
              >
                {/* Avatar */}
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.fullName || user.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate hover:underline">
                      {user.fullName || user.username}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user.username}
                  </p>
                  {user.bio && (
                    <p className="text-sm mt-1 line-clamp-2 text-foreground/90">
                      {user.bio}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
