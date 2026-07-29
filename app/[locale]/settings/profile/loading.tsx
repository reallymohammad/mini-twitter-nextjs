export default function EditProfileLoading() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-6 w-32 bg-muted rounded mb-6" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="mb-4">
          <div className="h-4 w-20 bg-muted rounded mb-1" />
          <div className="h-10 w-full bg-muted rounded" />
        </div>
      ))}
      <div className="h-10 w-24 bg-muted rounded mt-6" />
    </div>
  );
}
