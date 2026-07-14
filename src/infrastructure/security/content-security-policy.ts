type PublicEnvironment = Readonly<Record<string, string | undefined>>;

const LOCAL_HTTP_HOSTNAMES = ["localhost", "127.0.0.1"];

/**
 * Derives the minimal extra connect-src allowlist for the configured
 * browser-facing Supabase project. Mirrors the fail-closed URL rules of
 * readSupabasePublicConfig: https anywhere, or http only on localhost.
 * Anything else yields an empty allowlist so the CSP stays at 'self'.
 */
export function resolveSupabaseConnectSources(
  environment: PublicEnvironment,
): readonly string[] {
  const rawUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!rawUrl) return [];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return [];
  }

  if (parsedUrl.protocol === "https:") {
    return [parsedUrl.origin, parsedUrl.origin.replace(/^https:/, "wss:")];
  }

  if (
    parsedUrl.protocol === "http:" &&
    LOCAL_HTTP_HOSTNAMES.includes(parsedUrl.hostname)
  ) {
    return [parsedUrl.origin, parsedUrl.origin.replace(/^http:/, "ws:")];
  }

  return [];
}

export function buildContentSecurityPolicy(
  environment: PublicEnvironment,
): string {
  const supabaseSources = resolveSupabaseConnectSources(environment);
  const connectSrc = ["'self'", ...supabaseSources].join(" ");

  // upgrade-insecure-requests would rewrite the local http Supabase origin
  // to https and break local development, so it is dropped only in that case.
  const usesLocalHttpSupabase = supabaseSources.some((source) =>
    source.startsWith("http:"),
  );

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    `connect-src ${connectSrc}`,
    ...(usesLocalHttpSupabase ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}
