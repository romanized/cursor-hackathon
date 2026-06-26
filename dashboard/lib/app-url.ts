const LOCAL = "http://localhost:3000";

/** Auth redirect base. Prefers NEXT_PUBLIC_APP_URL; falls back to the live request origin. */
export function resolveAppUrl(origin?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && configured !== LOCAL) return configured;

  const runtime =
    origin?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : undefined);
  if (runtime) return runtime;

  return configured ?? LOCAL;
}

if (process.env.NODE_ENV !== "production") {
  console.assert(
    resolveAppUrl("https://example.com") === "https://example.com",
    "[app-url] runtime origin fallback failed"
  );
}
