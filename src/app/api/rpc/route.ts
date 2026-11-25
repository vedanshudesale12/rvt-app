import { cookies } from "next/headers";
import { z } from "zod";
import { AppError } from "@/domain/errors";
import {
  bulkSaleSchema,
  chatSchema,
  checkInSchema,
  compSchema,
  eventSchema,
  expenseSchema,
  logSaleSchema,
  reviewCompSchema,
  staffSchema,
  statusSchema,
} from "@/domain/schemas";
import { currentActor } from "@/server/actor";
import { assertCsrf, handle, readJson } from "@/server/http";
import { hitLimit } from "@/server/rate-limit";
import {
  addExpense,
  chat,
  deleteEvent,
  checkIn,
  createStaff,
  logBulk,
  logSale,
  markNotice,
  requestComp,
  reviewComp,
  reviewSale,
  saveEvent,
  setUserStatus,
  settleEvent,
  voidExpense,
} from "@/server/ops";
import { cookieBase } from "@/server/session";
import { getStore } from "@/server/store";

const bodySchema = z.object({ action: z.string(), payload: z.unknown().optional() }).strict();

export async function POST(request: Request) {
  return handle(async () => {
    assertCsrf(request);
    const actor = await currentActor();
    if (!actor || actor.status !== "active") throw new AppError(401, "Sign in required");
    const cap = actor.role === "door" ? 2000 : 120;
    await hitLimit(`api:${actor.id}`, cap, 60 * 1000);
    const body = bodySchema.parse(await readJson(request));
    const store = await getStore();
    const payload = body.payload ?? {};
    switch (body.action) {
      case "logSale":
        return logSale(actor, logSaleSchema.parse(payload), store);
      case "logBulk": {
        const input = bulkSaleSchema.parse(payload);
        return logBulk(actor, input.eventId, input.rows, store);
      }
      case "requestComp":
        return requestComp(actor, compSchema.parse(payload), store);
      case "reviewSale": {
        const input = z.object({ id: z.uuid(), decision: z.enum(["verified", "rejected"]) }).strict().parse(payload);
        return reviewSale(actor, input.id, input.decision, store);
      }
      case "reviewComp": {
        const input = reviewCompSchema.parse(payload);
        return reviewComp(actor, input.id, input.decision, store);
      }
      case "checkIn":
        return checkIn(actor, checkInSchema.parse(payload).saleId, store);
      case "addExpense":
        return addExpense(actor, expenseSchema.parse(payload), store);
      case "voidExpense":
        return voidExpense(actor, z.object({ id: z.uuid() }).parse(payload).id, store);
      case "saveEvent":
        return saveEvent(actor, eventSchema.parse(payload), store);
      case "deleteEvent":
        return deleteEvent(actor, z.object({ eventId: z.uuid() }).strict().parse(payload).eventId, store);
      case "settle":
        return settleEvent(actor, store, z.object({ eventId: z.uuid() }).parse(payload).eventId);
      case "createStaff":
        return createStaff(actor, staffSchema.parse(payload), store);
      case "setUser": {
        const input = z.object({ id: z.uuid() }).and(statusSchema).parse(payload);
        return setUserStatus(actor, input.id, input, store);
      }
      case "chat":
        return chat(actor, store, chatSchema.parse(payload).eventId ?? null, chatSchema.parse(payload).message);
      case "markNotice":
        return markNotice(actor, z.object({ id: z.uuid() }).parse(payload).id, store);
      case "setEvent": {
        const eventId = z.object({ eventId: z.uuid() }).parse(payload).eventId;
        const jar = await cookies();
        jar.set("rvt_event", eventId, { ...cookieBase(), httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
        return { ok: true };
      }
      case "push": {
        const input = z.object({ endpoint: z.string().url(), p256dh: z.string(), authKey: z.string() }).parse(payload);
        await store.savePush({ id: crypto.randomUUID(), userId: actor.id, endpoint: input.endpoint, p256dh: input.p256dh, authKey: input.authKey, createdAt: new Date().toISOString() });
        return { ok: true };
      }
      default:
        throw new AppError(404, "Unknown action");
    }
  });
}
