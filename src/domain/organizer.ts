import type { Assignment, EventRow, Profile } from "@/domain/types";

function ticketingIds(profiles: Profile[]): Set<string> {
  return new Set(profiles.filter((profile) => profile.role === "ticketing_partner").map((profile) => profile.id));
}

export function organizerKind(event: EventRow, assignments: Assignment[], profiles: Profile[]): string {
  const ticketing = ticketingIds(profiles);
  const hasTicketing = assignments.some((row) => row.eventId === event.id && ticketing.has(row.profileId));
  const hasCollab = event.isCollab;
  if (hasCollab && hasTicketing) return "RVT + Collab + Ticketing";
  if (hasCollab) return "RVT + Collab";
  if (hasTicketing) return "RVT + Ticketing";
  return "RVT";
}

export function partnerNames(event: EventRow, assignments: Assignment[], profiles: Profile[]): string[] {
  const names: string[] = [];
  if (event.isCollab) {
    const shares =
      event.collabShares && event.collabShares.length > 0
        ? event.collabShares
        : [{ brand: event.collabBrand, partnerId: event.collabPartnerId, splitBps: event.collabSplitBps }];
    for (const share of shares) {
      const profile = share.partnerId ? profiles.find((row) => row.id === share.partnerId) : undefined;
      const label = [share.brand, profile && profile.fullName !== share.brand ? profile.fullName : null]
        .filter(Boolean)
        .join(" · ");
      if (label) names.push(label);
    }
  }
  const ticketing = ticketingIds(profiles);
  for (const row of assignments.filter((item) => item.eventId === event.id && ticketing.has(item.profileId))) {
    const profile = profiles.find((item) => item.id === row.profileId);
    if (profile?.fullName) names.push(profile.fullName);
  }
  return names;
}

export function eventSwitcherLabel(name: string, date: string, collab?: string | null): string {
  return collab ? `${name} · ${date} · ${collab}` : `${name} · ${date}`;
}
