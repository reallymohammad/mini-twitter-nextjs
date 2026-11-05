// app/[locale]/(main)/messages/layout.tsx
import { ReactNode } from "react";
import { getConversations } from "@/lib/dm/actions";
import MessagesContainer from "@/components/messages/MessagesContainer";

export default async function MessagesLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const conversations = await getConversations();

  return (
    <MessagesContainer conversations={conversations} locale={locale}>
      {children}
    </MessagesContainer>
  );
}
