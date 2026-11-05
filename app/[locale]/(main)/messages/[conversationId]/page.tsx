// app/[locale]/(main)/messages/[conversationId]/page.tsx
import { notFound } from "next/navigation";
import ChatWindow from "@/components/messages/ChatWindow";
import { getConversationDetails } from "@/lib/dm/actions";
import { getCurrentUser } from "@/lib/session";

interface PageProps {
  params: Promise<{
    locale: string;
    conversationId: string;
  }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { locale, conversationId } = await params;
  const [currentUser, data] = await Promise.all([
    getCurrentUser(),
    getConversationDetails(conversationId),
  ]);

  if (!currentUser || !data) {
    notFound();
  }

  // ساخت recipient سازگار با ChatWindow
  const recipient = data.otherUser
    ? {
        id: data.otherUser.id,
        name: data.otherUser.fullName,
        username: data.otherUser.username,
        image: data.otherUser.avatarUrl,
      }
    : null;

  return (
    <ChatWindow
      conversationId={data.id}
      currentUserId={currentUser.id}
      recipient={recipient}
      messages={data.messages}
      locale={locale}
    />
  );
}
