import { writeFileSync } from "node:fs";
import { buildContentSecurityPolicy } from "../src/infrastructure/security/content-security-policy";

const csp = buildContentSecurityPolicy(process.env);

const headers = [
  "/*",
  `  Content-Security-Policy: ${csp}`,
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
  "  X-Content-Type-Options: nosniff",
  "  X-Frame-Options: DENY",
  "  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
  "",
].join("\n");

writeFileSync("out/_headers", headers);
console.log("wrote out/_headers");
