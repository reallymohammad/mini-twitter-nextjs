// app/[locale]/[username]/loading.tsx
export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="h-36 bg-muted" />
      <div className="px-4 pb-4">
        <div className="w-20 h-20 rounded-full bg-muted border-4 border-background -mt-10 mb-3" />
        <div className="h-5 w-32 bg-muted rounded mb-2" />
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-4 w-full bg-muted rounded mb-2" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
    </div>
  );
}
