import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User } from "lucide-react";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ locale: string; postId: string }>;
}

export default async function LikesPage({ params }: Props) {
  const { locale, postId } = await params;

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true },
  });

  if (!post) notFound();

  const likes = await prisma.like.findMany({
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

  return (
    <div className="mx-auto min-h-screen max-w-2xl border-x border-border">
      <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <Link
          href={`/${locale}/status/${postId}`}
          className="-ml-2 rounded-full p-2 transition-colors hover:bg-muted"
          aria-label="Back to post"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <h1 className="text-xl font-bold">Liked by</h1>
      </div>

      <div className="divide-y divide-border">
        {likes.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No likes yet.
          </p>
        ) : (
          likes.map(({ user }) => (
            <Link
              key={user.id}
              href={`/${locale}/${user.username}`}
              className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/30"
            >
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
          ))
        )}
      </div>
    </div>
  );
}
