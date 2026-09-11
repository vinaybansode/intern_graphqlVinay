"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = error.message?.startsWith("Not permitted") || error.name === "ForbiddenError";
  return (
    <div className="grid place-items-center py-20 text-center">
      <div className="card max-w-md p-8">
        <div className="mb-2 text-4xl">{forbidden ? "🔒" : "⚠️"}</div>
        <h1 className="text-lg font-semibold">{forbidden ? "Access denied" : "Something went wrong"}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {forbidden
            ? "You do not have permission to view this page. This is enforced on the server."
            : "An unexpected error occurred while loading this page."}
        </p>
        {!forbidden && (
          <button onClick={reset} className="btn-ghost mt-4">Try again</button>
        )}
        <a href="/" className="btn-primary mt-4">Back to dashboard</a>
      </div>
    </div>
  );
}
