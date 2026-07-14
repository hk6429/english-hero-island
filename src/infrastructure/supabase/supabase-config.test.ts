import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const config = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8",
).toLowerCase();
const authConfig = config.match(/\[auth\]\n([\s\S]*?)(?=\n\[)/)?.[1] ?? "";
const seedConfig = config.match(/\[db\.seed\]\n([\s\S]*?)(?=\n\[)/)?.[1] ?? "";

describe("Supabase classroom configuration", () => {
  it("enables anonymous student identities without auto-seeding unreviewed questions", () => {
    expect(authConfig).toMatch(/^enable_anonymous_sign_ins = true$/m);
    expect(seedConfig).toMatch(/^enabled = false$/m);
  });
});
