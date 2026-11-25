export const ROLES = [
  "admin",
  "pr",
  "data_entry",
  "door",
  "ticketing_partner",
  "collab_partner",
] as const;

export type Role = (typeof ROLES)[number];

export const SIGNUP_ROLES = ["pr", "ticketing_partner", "collab_partner"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export type Status = "active" | "pending" | "disabled";
export type EventStatus = "draft" | "published" | "live" | "settled" | "cancelled" | "postponed";
export type SaleStatus = "pending" | "verified" | "rejected" | "refunded";

export const EVENT_KINDS = [
  "club_night",
  "house_party",
  "themed_party",
  "concert",
  "dj_night",
  "college_fest",
  "corporate_mixer",
  "pool_party",
  "rooftop",
  "boat_party",
  "day_party",
  "festival_holi",
  "festival_diwali",
  "festival_nye",
  "festival_halloween",
  "festival_christmas",
  "multiday_festival",
  "collab_company",
  "venue_partner",
  "free_rsvp",
  "guest_list",
  "private_invite",
  "cancelled",
  "postponed",
  "sold_out",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const SALES_COMBOS = [
  "rvt_solo",
  "rvt_collab",
  "rvt_ticketing",
  "ticketing_only",
  "rvt_collab_ticketing",
  "multi_collab",
  "multi_ticketing",
  "collab_hosted",
  "venue_bar",
] as const;

export type SalesCombo = (typeof SALES_COMBOS)[number];
export type CompStatus = "pending" | "approved" | "rejected";
export type Side = "rvt" | "collab";
export type CollectedBy = "pr" | "company" | "ticketing_partner";

export type Actor = {
  id: string;
  role: Role;
  status: Status;
  fullName: string;
  email: string;
  isOwner: boolean;
  ownerSlot: "vedanshu" | "rishab" | null;
};

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  role: Role | null;
  status: Status;
  isOwner: boolean;
  ownerSlot: "vedanshu" | "rishab" | null;
  commissionBps: number;
  /** Flat ticketing cut per paying guest, in paise. Missing means Rs 100. */
  commissionPaise?: number;
  instagram: string;
  college: string;
  area: string;
  referrer: string;
  photoPath: string | null;
  phoneLast4: string;
  createdAt: string;
  deletedAt: string | null;
};

export type EventRow = {
  id: string;
  name: string;
  eventDate: string;
  venue: string;
  startsAt: string;
  status: EventStatus;
  prCommissionPaise: number;
  barRevenuePaise: number;
  barSplitBps: number;
  barPartnerName: string;
  isCollab: boolean;
  collabBrand: string;
  collabPartnerId: string | null;
  collabSplitBps: number;
  settledAt: string | null;
  createdBy: string | null;
  deletedAt: string | null;
  kind?: EventKind;
  /** Null means no cap. */
  capacity?: number | null;
  minAge?: number;
  alcohol?: boolean;
  guardianRequired?: boolean;
  waitlistCount?: number;
  postponedTo?: string | null;
  /** Extra collab companies. The first still mirrors collabPartnerId. */
  collabShares?: { brand: string; splitBps: number; partnerId: string | null }[];
};

export type TicketType = {
  id: string;
  eventId: string;
  name: string;
  pricePaise: number;
  sortOrder: number;
  /** Early-bird or phase window. Sales outside it are refused. */
  saleEndsAt?: string | null;
};

export type Assignment = {
  id: string;
  eventId: string;
  profileId: string;
  side: Side;
  commissionPaise: number | null;
  /** Ticketing percent override for this event. Null uses the partner's own rate. */
  commissionBps?: number | null;
};

export type Sale = {
  id: string;
  eventId: string;
  prId: string | null;
  promoterName: string | null;
  side: Side;
  guestName: string;
  ticketTypeId: string;
  amountPaise: number;
  status: SaleStatus;
  isComp: boolean;
  compStatus: CompStatus | null;
  collectedBy: CollectedBy;
  ticketingPartnerId: string | null;
  loggedBy: string;
  proofPath: string | null;
  checkedInAt: string | null;
  checkedInBy: string | null;
  source: "manual" | "bulk_chat";
  notes: string;
  phoneLast4: string;
  createdAt: string;
  deletedAt: string | null;
  paymentMethod?: "upi" | "cash" | "partner" | "rsvp";
  checkInCode?: string;
  collabPartnerId?: string | null;
};

export type Expense = {
  id: string;
  eventId: string;
  category: string;
  description: string;
  amountPaise: number;
  createdBy: string;
  receiptPath: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type Notice = {
  id: string;
  userId: string;
  eventId: string | null;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ChatLine = {
  id: string;
  userId: string;
  eventId: string | null;
  role: "user" | "assistant";
  body: string;
  createdAt: string;
};

export type PushSub = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  authKey: string;
  createdAt: string;
};
