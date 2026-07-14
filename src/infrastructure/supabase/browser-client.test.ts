import { describe, expect, it } from "vitest";
import { readSupabasePublicConfig } from "./browser-client";

describe("readSupabasePublicConfig", () => {
  it("accepts only a public browser key and never falls back to a service-role secret", () => {
    expect(
      readSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://hero-island.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser_key",
      }),
    ).toEqual({
      url: "https://hero-island.supabase.co",
      publicKey: "sb_publishable_browser_key",
    });

    expect(
      readSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://hero-island.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "must-never-reach-the-browser",
      }),
    ).toBeNull();
  });
});
