import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  resolveSupabaseConnectSources,
} from "./content-security-policy";

describe("resolveSupabaseConnectSources", () => {
  it("returns the https origin plus its realtime wss origin", () => {
    expect(
      resolveSupabaseConnectSources({
        NEXT_PUBLIC_SUPABASE_URL: "https://hero-island.supabase.co",
      }),
    ).toEqual(["https://hero-island.supabase.co", "wss://hero-island.supabase.co"]);
  });

  it("strips any path so only the origin is allowlisted", () => {
    expect(
      resolveSupabaseConnectSources({
        NEXT_PUBLIC_SUPABASE_URL: "https://hero-island.supabase.co/rest/v1/",
      }),
    ).toEqual(["https://hero-island.supabase.co", "wss://hero-island.supabase.co"]);
  });

  it("returns the local http origin plus its ws origin for local Supabase", () => {
    expect(
      resolveSupabaseConnectSources({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).toEqual(["http://127.0.0.1:54321", "ws://127.0.0.1:54321"]);
  });

  it("fails closed on missing, non-local http, or malformed URLs", () => {
    expect(resolveSupabaseConnectSources({})).toEqual([]);
    expect(
      resolveSupabaseConnectSources({
        NEXT_PUBLIC_SUPABASE_URL: "http://evil.example.com",
      }),
    ).toEqual([]);
    expect(
      resolveSupabaseConnectSources({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      }),
    ).toEqual([]);
    expect(
      resolveSupabaseConnectSources({
        NEXT_PUBLIC_SUPABASE_URL: "   ",
      }),
    ).toEqual([]);
  });
});

describe("buildContentSecurityPolicy", () => {
  it("keeps connect-src 'self' and upgrade-insecure-requests when Supabase is not configured", () => {
    const policy = buildContentSecurityPolicy({});
    expect(policy).toContain("connect-src 'self' https://hk6429.goatcounter.com;");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("allowlists exactly the configured cloud Supabase origins", () => {
    const policy = buildContentSecurityPolicy({
      NEXT_PUBLIC_SUPABASE_URL: "https://hero-island.supabase.co",
    });
    expect(policy).toContain(
      "connect-src 'self' https://hero-island.supabase.co wss://hero-island.supabase.co https://hk6429.goatcounter.com;",
    );
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("connect-src *");
  });

  it("drops upgrade-insecure-requests only when local http Supabase is configured", () => {
    const policy = buildContentSecurityPolicy({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    });
    expect(policy).toContain(
      "connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321 https://hk6429.goatcounter.com",
    );
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("keeps the existing hardening directives untouched", () => {
    const policy = buildContentSecurityPolicy({
      NEXT_PUBLIC_SUPABASE_URL: "https://hero-island.supabase.co",
    });
    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https://visitor-badge.laobi.icu https://hk6429.goatcounter.com",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://gc.zgo.at",
    ]) {
      expect(policy).toContain(directive);
    }
  });
});
