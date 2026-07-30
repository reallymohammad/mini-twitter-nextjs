import Image from "next/image";
import Link from "next/link";
import type { User } from "@prisma/client";

interface Props {
  user: Pick<User, "id" | "username" | "name" | "avatarUrl" | "bio">;
}

export default function RightSidebar({ user }: Props) {
  return (
    <div className="bg-muted rounded-2xl p-4">
      <div className="flex items-center gap-3">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name ?? ""}
            width={48}
            height={48}
            className="rounded-full w-12 h-12 object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-background" />
        )}
        <div className="min-w-0">
          <p className="font-semibold truncate">{user.name}</p>
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
        </div>
      </div>
      {user.bio && (
        <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{user.bio}</p>
      )}
      <Link
        href={`/${user.username}`}
        className="mt-3 block text-center text-sm font-semibold text-primary hover:underline"
      >
        View profile
      </Link>
    </div>
  );
}
