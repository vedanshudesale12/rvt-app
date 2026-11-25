import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(".next/static");
const banned = [
  "SUPABASE_SERVICE_ROLE",
  "rvt-demo-field-key-32b-not-prod!",
  "rvt-demo-session-secret-not-for-production",
  "BEGIN PRIVATE KEY",
  "service_role",
];

function files(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files(full, found);
    else if (/\.(js|css|json|map)$/.test(entry)) found.push(full);
  }
  return found;
}

const hits = [];
for (const file of files(root)) {
  const text = readFileSync(file, "utf8");
  for (const needle of banned) {
    if (text.includes(needle)) hits.push(`${path.relative(".", file)} contains ${needle}`);
  }
}
if (hits.length) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log("client bundle has no server secrets");
