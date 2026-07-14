import { describe, expect, it } from "vitest";
import { generateJoinCode } from "./generate-join-code";

describe("generateJoinCode", () => {
  it("creates six easy-to-read characters without 0, O, 1, or I", () => {
    const code = generateJoinCode((bytes) => {
      bytes.set([0, 1, 8, 9, 30, 31]);
      return bytes;
    });

    expect(code).toBe("23ABYZ");
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });
});
