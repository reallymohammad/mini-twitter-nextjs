"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ConversationList from "./ConversationList";
import { cn } from "@/lib/utils";

interface MessagesContainerProps {
  children: ReactNode;
  conversations: React.ComponentProps<
    typeof ConversationList
  >["conversations"];
  locale: string;
}

export default function MessagesContainer({
  children,
  conversations,
  locale,
}: MessagesContainerProps) {
  const pathname = usePathname();

  const isExactMessagesRoot =
    pathname === `/${locale}/messages` ||
    pathname === `/${locale}/messages/`;

  const isInConversation = !isExactMessagesRoot;

  return (
    <div className="h-[calc(100dvh-64px)] w-full">
      <div className="mx-auto flex h-full w-full max-w-6xl overflow-hidden border-x border-border bg-background">
        <aside
          className={cn(
            "h-full w-full shrink-0 border-e border-border md:block md:w-80 lg:w-96",
            isInConversation ? "hidden md:block" : "block",
          )}
        >
          <ConversationList
            key={JSON.stringify(conversations.map(({ id }) => id))}
            conversations={conversations}
            locale={locale}
          />
        </aside>

        <section
          className={cn(
            "h-full flex-1 bg-background",
            isInConversation ? "block" : "hidden md:block",
          )}
        >
          {children}
        </section>
      </div>
    </div>
  );
}
