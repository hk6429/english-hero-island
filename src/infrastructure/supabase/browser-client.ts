import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type PublicEnvironment = Readonly<Record<string, string | undefined>>;

export type SupabasePublicConfig = Readonly<{
  url: string;
  publicKey: string;
}>;

export function readSupabasePublicConfig(
  environment: PublicEnvironment,
): SupabasePublicConfig | null {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey =
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publicKey) return null;

  try {
    const parsedUrl = new URL(url);
    const isLocalHttp =
      parsedUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsedUrl.hostname);
    if (parsedUrl.protocol !== "https:" && !isLocalHttp) return null;
  } catch {
    return null;
  }

  return { url, publicKey };
}

export function createBrowserSupabaseClient(
  scope: "student" | "teacher",
): SupabaseClient | null {
  const config = readSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!config) return null;

  return createClient(config.url, config.publicKey, {
    auth: {
      storageKey: `english-hero-island-${scope}-auth`,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: scope === "teacher",
    },
  });
}
