import type { Role, Status } from "@/domain/types";

const PAGE_ROLES: { test: (path: string) => boolean; roles: Role[]; home?: string }[] = [
  { test: (p) => p === "/" || p.startsWith("/dashboard"), roles: ["admin", "pr", "data_entry", "collab_partner", "ticketing_partner"] },
  { test: (p) => p.startsWith("/guests") || p.startsWith("/comps"), roles: ["admin", "pr", "data_entry", "collab_partner", "ticketing_partner"] },
  { test: (p) => p.startsWith("/ledger"), roles: ["admin", "data_entry", "collab_partner"] },
  { test: (p) => p.startsWith("/settle"), roles: ["admin", "pr", "ticketing_partner", "collab_partner"] },
  { test: (p) => p.startsWith("/door"), roles: ["admin", "pr", "door"] },
  { test: (p) => p.startsWith("/chat"), roles: ["admin", "pr", "data_entry"] },
  { test: (p) => p.startsWith("/leaderboard"), roles: ["admin", "pr", "ticketing_partner"] },
  { test: (p) => p.startsWith("/events"), roles: ["admin", "pr", "data_entry", "collab_partner", "ticketing_partner"] },
  { test: (p) => p.startsWith("/ticketing"), roles: ["admin", "ticketing_partner"] },
  { test: (p) => p.startsWith("/people") || p.startsWith("/audit"), roles: ["admin"] },
  { test: (p) => p.startsWith("/account") || p.startsWith("/pending"), roles: ["admin", "pr", "data_entry", "door", "ticketing_partner", "collab_partner"] },
];

export function homeFor(role: Role): string {
  if (role === "door") return "/door";
  if (role === "ticketing_partner") return "/ticketing";
  return "/dashboard";
}

export function canAccessPath(actor: { role: Role | null; status: Status }, path: string): boolean {
  if (!actor.role || actor.status === "disabled") return false;
  const clean = path.split("?")[0] || "/";
  if (actor.status === "pending") {
    return clean === "/pending" || clean.startsWith("/account") || clean.startsWith("/api/auth/");
  }
  if (clean.startsWith("/api/")) return true;
  if (clean === "/pending") return false;
  const rule = PAGE_ROLES.find((item) => item.test(clean));
  if (!rule) return false;
  return rule.roles.includes(actor.role);
}

export type NavItem = { href: string; label: string };

export function navFor(role: Role): NavItem[] {
  const items: { href: string; label: string; roles: Role[] }[] = [
    { href: "/dashboard", label: "Tonight", roles: ["admin", "pr", "data_entry", "collab_partner", "ticketing_partner"] },
    { href: "/guests", label: "Guest list", roles: ["admin", "pr", "data_entry", "collab_partner", "ticketing_partner"] },
    { href: "/comps", label: "Comps", roles: ["admin", "pr", "data_entry"] },
    { href: "/ledger", label: "Ledger", roles: ["admin", "data_entry", "collab_partner"] },
    { href: "/settle", label: "Who owes what", roles: ["admin", "pr", "ticketing_partner", "collab_partner"] },
    { href: "/door", label: "Door", roles: ["admin", "pr", "door"] },
    { href: "/chat", label: "Chat", roles: ["admin", "pr", "data_entry"] },
    { href: "/leaderboard", label: "Leaderboard", roles: ["admin", "pr", "ticketing_partner"] },
    { href: "/events", label: "Events", roles: ["admin", "pr", "data_entry", "collab_partner", "ticketing_partner"] },
    { href: "/ticketing", label: "Ticketing", roles: ["admin", "ticketing_partner"] },
    { href: "/people", label: "People", roles: ["admin"] },
    { href: "/audit", label: "Audit", roles: ["admin"] },
  ];
  return items.filter((item) => item.roles.includes(role)).map(({ href, label }) => ({ href, label }));
}
