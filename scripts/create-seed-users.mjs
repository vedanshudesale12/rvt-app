import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD;
if (!url || !key || !password) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SEED_PASSWORD");
  process.exit(1);
}
const ids = JSON.parse(readFileSync(new URL("../supabase/seed-ids.json", import.meta.url)));
const people = [
  ["vedanshu", "Vedanshu", "vedanshu@rvt.demo"],
  ["rishab", "Rishab Pawar", "rishab@rvt.demo"],
  ["aisha", "Aisha Kulkarni", "aisha@rvt.demo"],
  ["kabir", "Kabir Shah", "kabir@rvt.demo"],
  ["neha", "Neha Deshpande", "neha@rvt.demo"],
  ["imran", "Imran Shaikh", "imran@rvt.demo"],
  ["boxoffice", "Box Office", "boxoffice@rvt.demo"],
  ["northline", "Northline", "northline@rvt.demo"],
];
const supabase = createClient(url, key, { auth: { persistSession: false } });
for (const [id, name, email] of people) {
  const { error } = await supabase.auth.admin.createUser({
    id: ids[id],
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error && !/already/i.test(error.message)) {
    console.error(email, error.message);
    process.exit(1);
  }
  console.log(email);
}
console.log("Auth users ready. Run supabase/seed.sql in the SQL editor if you have not.");
