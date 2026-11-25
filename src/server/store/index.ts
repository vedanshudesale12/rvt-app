import { AppError } from "@/domain/errors";
import { hashPassword } from "@/server/crypto";
import {
  demoAssignments,
  demoEvents,
  demoExpenses,
  demoPasswords,
  demoPhones,
  demoProfiles,
  demoSales,
  demoTickets,
} from "@/server/store/demo";
import { createMemoryStore } from "@/server/store/memory";
import type { Store } from "@/server/store/types";

const globalStore = globalThis as { __backstageDemo?: Promise<Store> };

async function loadDemo(): Promise<Store> {
  const passwords: Record<string, string> = {};
  for (const [email, password] of Object.entries(demoPasswords())) {
    passwords[email] = await hashPassword(password);
  }
  return createMemoryStore({
    profiles: demoProfiles(),
    events: demoEvents(),
    tickets: demoTickets(),
    assignments: demoAssignments(),
    sales: demoSales(),
    expenses: demoExpenses(),
    phones: demoPhones(),
    passwords,
  });
}

export async function getStore(): Promise<Store> {
  if (process.env.NODE_ENV === "production" && process.env.RVT_DEMO === "1") {
    throw new Error("RVT_DEMO must not be set in production");
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const { createSupabaseStore } = await import("@/server/store/supabase-store");
    return createSupabaseStore();
  }
  if (process.env.RVT_DEMO === "1") {
    globalStore.__backstageDemo ??= loadDemo();
    return globalStore.__backstageDemo;
  }
  throw new AppError(500, "Add Supabase keys in .env.local, or set RVT_DEMO=1 to click through locally.");
}
