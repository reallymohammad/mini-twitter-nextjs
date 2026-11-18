"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { startDirectConversation } from "@/lib/dm/actions";

interface DirectMessageButtonProps {
  recipientUserId: string;
  locale: string;
  username: string;
}

export default function DirectMessageButton({
  recipientUserId,
  locale,
  username,
}: DirectMessageButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDirectMessage() {
    startTransition(async () => {
      try {
        const result = await startDirectConversation(recipientUserId);
        if (result?.conversationId) {
          router.push(`/${locale}/messages/${result.conversationId}`);
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "امکان ارسال پیام به این کاربر وجود ندارد.";
        window.alert(message);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDirectMessage}
      disabled={isPending}
      title="Direct Message"
      aria-label={`Send direct message to @${username}`}
      className="rounded-full border border-border p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      ) : (
        <Mail size={18} />
      )}
    </button>
  );
}
