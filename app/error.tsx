"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-danger">
        Something broke
      </p>
      <h1 className="text-2xl font-semibold">RCI Labs could not render this page</h1>
      <p className="max-w-md text-sm text-muted">
        {error.message || "Unknown error"}
      </p>
      <button
        className="rounded-lg bg-ink px-4 py-2 text-sm text-white"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
