import { z } from "zod";

const phone = z.string().trim().min(8).max(20);
const name = z.string().trim().min(1).max(120);
const money = z.number().finite().min(0).max(10_000_000);

export const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8).max(200),
  turnstileToken: z.string().max(4000).optional(),
});

export const signupSchema = z.strictObject({
  fullName: name,
  phone,
  email: z.email(),
  password: z.string().min(8).max(200),
  instagram: z.string().trim().max(60).optional(),
  college: z.string().trim().max(120).optional(),
  area: z.string().trim().max(80).optional(),
  upi: z.string().trim().max(80).optional(),
  referrer: z.string().trim().max(120).optional(),
  photoPath: z.string().max(200).optional(),
  role: z.enum(["pr", "ticketing_partner", "collab_partner"]),
  agreed: z.literal(true),
  turnstileToken: z.string().max(4000).optional(),
});

export const logSaleSchema = z.strictObject({
  eventId: z.uuid(),
  guestName: name,
  phone,
  ticketTypeId: z.uuid(),
  notes: z.string().max(500).optional(),
  prId: z.uuid().optional(),
  side: z.enum(["rvt", "collab"]).optional(),
  promoterName: z.string().trim().max(120).optional(),
  ticketingPartnerId: z.uuid().optional(),
  collectedBy: z.enum(["pr", "company", "ticketing_partner"]).optional(),
  proofPath: z.string().max(200).optional(),
});

export const bulkSaleSchema = z.strictObject({
  eventId: z.uuid(),
  rows: z.array(
    z.strictObject({
      guestName: name,
      phone,
      ticketTypeId: z.uuid(),
    }),
  ).min(1).max(200),
});

export const compSchema = z.strictObject({
  eventId: z.uuid(),
  guestName: name,
  phone,
  ticketTypeId: z.uuid(),
  notes: z.string().max(500).optional(),
  prId: z.uuid().optional(),
});

export const reviewSchema = z.strictObject({
  decision: z.enum(["verified", "rejected", "approved"]),
});

export const expenseSchema = z.strictObject({
  eventId: z.uuid(),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(200),
  amountRupees: money,
  receiptPath: z.string().max(200).optional(),
});

export const eventSchema = z.strictObject({
  id: z.uuid().optional(),
  name: name,
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().trim().min(1).max(160),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(["draft", "published", "live", "settled"]),
  prCommissionRupees: money,
  barRevenueRupees: money,
  barSplitPercent: z.number().min(0).max(100),
  barPartnerName: z.string().trim().max(120).optional(),
  isCollab: z.boolean(),
  collabBrand: z.string().trim().max(120).optional(),
  collabPartnerId: z.uuid().nullable().optional(),
  collabSplitPercent: z.number().min(0).max(100),
  ticketTypes: z.array(
    z.strictObject({
      id: z.uuid().optional(),
      name: name,
      priceRupees: money,
    }),
  ).min(1).max(12),
  prIds: z.array(z.uuid()).max(200),
});

export const staffSchema = z.strictObject({
  fullName: name,
  email: z.email(),
  phone,
  password: z.string().min(8).max(200),
  role: z.enum(["door", "data_entry"]),
});

export const statusSchema = z.strictObject({
  status: z.enum(["active", "pending", "disabled"]),
  role: z.enum(["admin", "pr", "data_entry", "door", "ticketing_partner", "collab_partner"]).optional(),
});

export const chatSchema = z.strictObject({
  eventId: z.uuid().nullable().optional(),
  message: z.string().trim().min(1).max(8000),
});

export const checkInSchema = z.strictObject({
  saleId: z.uuid(),
});

export const guestParseSchema = z.strictObject({
  guests: z.array(
    z.strictObject({
      guestName: name,
      phone,
      ticketType: z.string().trim().min(1).max(80),
    }),
  ).max(200),
});

export function zodMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}
