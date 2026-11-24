
"use client";

import { useEffect, useState } from "react";
import { Reactions, type Reaction as HairlineReaction } from "@/components/reactions";
import type { DirectMessage } from "./types";

const ALLOWED_REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Funny" },
  { emoji: "😮", label: "Surprised" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🙏", label: "Thanks" },
];

interface MessageReactionsProps {
  reactions: DirectMessage["reactions"];
  currentUserId: string;
  isMine: boolean;
  isReactionPending: boolean;
  onEmojiClick: (emoji: string) => Promise<void>;
}

function mapReactions(
  reactions: DirectMessage["reactions"],
  currentUserId: string
): HairlineReaction[] {
  const grouped = new Map<string, HairlineReaction>();

  for (const reaction of reactions ?? []) {
    if (!ALLOWED_REACTIONS.some((item) => item.emoji === reaction.emoji)) {
      continue;
    }

    const existing = grouped.get(reaction.emoji);

    if (existing) {
      existing.count += 1;

      if (reaction.userId === currentUserId) {
        existing.mine = true;
      }
    } else {
      grouped.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        mine: reaction.userId === currentUserId,
      });
    }
  }

  return Array.from(grouped.values());
}

export default function MessageReactions({
  reactions,
  currentUserId,
  isMine,
  isReactionPending,
  onEmojiClick,
}: MessageReactionsProps) {
  const [localReactions, setLocalReactions] = useState<HairlineReaction[]>(
    () => mapReactions(reactions, currentUserId)
  );

  // Sync with server/realtime updates.
  useEffect(() => {
    setLocalReactions(mapReactions(reactions, currentUserId));
  }, [reactions, currentUserId]);

  // Hairline supports multiple reactions by default.
  // Our database allows only one reaction per user per message.
  function handleValueChange(next: HairlineReaction[]) {
    setLocalReactions((previous) => {
      const newlySelected = next.find(
        (reaction) =>
          reaction.mine &&
          !previous.some(
            (old) => old.emoji === reaction.emoji && old.mine
          )
      );

      if (!newlySelected) {
        return next.filter((reaction) => reaction.count > 0);
      }

      return next
        .map((reaction) => {
          if (reaction.mine && reaction.emoji !== newlySelected.emoji) {
            return {
              ...reaction,
              count: Math.max(0, reaction.count - 1),
              mine: false,
            };
          }

          return reaction;
        })
        .filter((reaction) => reaction.count > 0);
    });
  }

  async function handleReact(emoji: string) {
    await onEmojiClick(emoji);
  }

  return (
    <div
      className={[
        "mt-1 flex w-full",
        isMine ? "justify-end" : "justify-start",
        isReactionPending ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <Reactions
        value={localReactions}
        onValueChange={handleValueChange}
        onReact={handleReact}
        choices={ALLOWED_REACTIONS}
        label="React to message"
        className="max-w-full"
      />
    </div>
  );
}
