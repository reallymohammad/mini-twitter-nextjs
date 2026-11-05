// components/messages/TypingIndicator.tsx
export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-3">
      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
    </div>
  );
}
