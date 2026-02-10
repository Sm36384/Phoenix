#!/usr/bin/env node
/**
 * Print which env vars are set (for deploy checklist). Run: npm run check-env
 * Loads .env from project root if present.
 */
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !m[1].startsWith("#")) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  });
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const optional = [
  "CRON_SECRET",
  "OPENAI_API_KEY",
  "APIFY_TOKEN",
  "APOLLO_API_KEY",
  "ENCRYPTION_KEY",
  "PHOENIX_COLLECTOR_URL",
  "FINGERPRINT_API_KEY",
  "PHANTOMBUSTER_API_KEY",
  "ZYTE_PROXY",
  "ZYTE_API_KEY",
];

console.log("Required (for auth + DB):");
required.forEach((k) => {
  const v = process.env[k];
  console.log(v ? `  \u2713 ${k}` : `  \u2717 ${k} (missing)`);
});
console.log("\nOptional:");
optional.forEach((k) => {
  const v = process.env[k];
  console.log(v ? `  \u2713 ${k}` : `  - ${k}`);
});
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  process.exitCode = 1;
  console.log("\nSet missing required vars in .env before deploy.");
}
