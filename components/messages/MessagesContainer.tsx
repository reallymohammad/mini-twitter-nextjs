// components/messages/MessagesContainer.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ConversationList from "./ConversationList";
import { cn } from "@/lib/utils";

interface MessagesContainerProps {
  children: ReactNode;
  conversations: any[];
  locale: string;
}

export default function MessagesContainer({
  children,
  conversations,
  locale,
}: MessagesContainerProps) {
  const pathname = usePathname();

  // آیا کاربر داخل یک گفتگوی خاص است؟ (مثلاً /fa/messages/clx123...)
  // اگر آدرس فقط /fa/messages باشد، isInConversation مقدار false خواهد داشت
  const isExactMessagesRoot =
    pathname === `/${locale}/messages` || pathname === `/${locale}/messages/`;
  const isInConversation = !isExactMessagesRoot;

  return (
    <div className="h-[calc(100dvh-64px)] w-full">
      <div className="mx-auto flex h-full w-full max-w-6xl overflow-hidden border-x border-border bg-background">
        
        {/* ستون لیست پیام‌ها: در دسکتاپ همیشه نمایش داده می‌شود، در موبایل فقط وقتی داخل چت نیستیم */}
        <aside
          className={cn(
            "h-full w-full border-e border-border md:w-80 lg:w-96 md:block shrink-0",
            isInConversation ? "hidden md:block" : "block"
          )}
        >
          <ConversationList conversations={conversations} locale={locale} />
        </aside>

        {/* ستون محتوای چت / صفحه خالی: در دسکتاپ همیشه هست، در موبایل فقط وقتی داخل چت هستیم */}
        <section
          className={cn(
            "h-full flex-1 bg-background",
            isInConversation ? "block" : "hidden md:block"
          )}
        >
          {children}
        </section>

      </div>
    </div>
  );
}
