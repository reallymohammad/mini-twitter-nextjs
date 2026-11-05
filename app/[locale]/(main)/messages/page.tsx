// app/[locale]/(main)/messages/page.tsx
export default function MessagesEmptyPage() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <h2 className="mb-2 text-xl font-bold text-foreground">
        پیامی را انتخاب کنید
      </h2>
      <p className="max-w-sm text-sm">
        از فهرست موجود یکی از گفتگوها را برگزینید یا مکالمه جدیدی را شروع کنید.
      </p>
    </div>
  );
}
