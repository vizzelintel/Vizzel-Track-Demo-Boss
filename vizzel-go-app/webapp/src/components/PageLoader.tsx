export function PageLoader({ label = "กำลังโหลด..." }: { label?: string }) {
  return (
    <div className="bg-background text-muted-foreground flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <div
        className="border-primary size-10 animate-spin rounded-full border-4 border-t-transparent"
        role="status"
        aria-label="loading"
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
