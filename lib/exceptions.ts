export class BlockedConversationError extends Error {
  constructor(message = "این گفتگو به دلیل تنظیمات بلاک در دسترس نیست.") {
    super(message);
    this.name = "BlockedConversationError";
  }
}
