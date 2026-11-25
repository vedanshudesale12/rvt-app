import { AppError } from "@/domain/errors";
import type { Assignment, ChatLine, EventRow, Profile, Sale } from "@/domain/types";
import { createAdminClient, createUserClient } from "@/server/supabase";
import type { Store } from "@/server/store/types";

type Row = Record<string, unknown>;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapProfile(row: Row): Profile {
  const priv = one(row.profile_private as Row | Row[] | null);
  const secret = one(row.profile_secrets as Row | Row[] | null);
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: String(priv?.email ?? ""),
    role: (row.role as Profile["role"]) ?? null,
    status: row.status as Profile["status"],
    isOwner: Boolean(row.is_owner),
    ownerSlot: (row.owner_slot as Profile["ownerSlot"]) ?? null,
    commissionBps: Number(row.commission_bps ?? 0),
    instagram: String(priv?.instagram_handle ?? ""),
    college: String(priv?.college_or_workplace ?? ""),
    area: String(priv?.area ?? ""),
    referrer: String(priv?.referrer ?? ""),
    photoPath: (priv?.photo_path as string | null) ?? null,
    phoneLast4: String(secret?.phone_last4 ?? ""),
    createdAt: String(row.created_at),
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}

function mapEvent(row: Row): EventRow {
  return {
    id: String(row.id),
    name: String(row.name),
    eventDate: String(row.event_date).slice(0, 10),
    venue: String(row.venue),
    startsAt: String(row.starts_at),
    status: row.status as EventRow["status"],
    prCommissionPaise: Number(row.pr_commission_paise),
    barRevenuePaise: Number(row.bar_revenue_paise),
    barSplitBps: Number(row.bar_split_bps),
    barPartnerName: String(row.bar_partner_name ?? ""),
    isCollab: Boolean(row.is_collab),
    collabBrand: String(row.collab_brand ?? ""),
    collabPartnerId: (row.collab_partner_id as string | null) ?? null,
    collabSplitBps: Number(row.collab_split_bps),
    settledAt: (row.settled_at as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    deletedAt: (row.deleted_at as string | null) ?? null,
    kind: row.kind ? (String(row.kind) as EventRow["kind"]) : undefined,
    capacity: row.capacity == null ? null : Number(row.capacity),
    minAge: row.min_age == null ? undefined : Number(row.min_age),
    alcohol: row.alcohol == null ? undefined : Boolean(row.alcohol),
    guardianRequired: row.guardian_required == null ? undefined : Boolean(row.guardian_required),
    waitlistCount: row.waitlist_count == null ? undefined : Number(row.waitlist_count),
    postponedTo: (row.postponed_to as string | null) ?? null,
    collabShares: Array.isArray(row.collab_shares) ? (row.collab_shares as EventRow["collabShares"]) : undefined,
  };
}

function mapSale(row: Row): Sale {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    prId: (row.pr_id as string | null) ?? null,
    promoterName: (row.promoter_name as string | null) ?? null,
    side: row.side as Sale["side"],
    guestName: String(row.guest_name),
    ticketTypeId: String(row.ticket_type_id),
    amountPaise: Number(row.amount_paise),
    status: row.status as Sale["status"],
    isComp: Boolean(row.is_comp),
    compStatus: (row.comp_status as Sale["compStatus"]) ?? null,
    collectedBy: row.collected_by as Sale["collectedBy"],
    ticketingPartnerId: (row.ticketing_partner_id as string | null) ?? null,
    loggedBy: String(row.logged_by),
    proofPath: (row.proof_path as string | null) ?? null,
    checkedInAt: (row.checked_in_at as string | null) ?? null,
    checkedInBy: (row.checked_in_by as string | null) ?? null,
    source: row.source as Sale["source"],
    notes: String(row.notes ?? ""),
    phoneLast4: String(row.phone_last4 ?? ""),
    createdAt: String(row.created_at),
    deletedAt: (row.deleted_at as string | null) ?? null,
    paymentMethod: row.payment_method as Sale["paymentMethod"],
    checkInCode: (row.check_in_code as string | null) ?? undefined,
    collabPartnerId: (row.collab_partner_id as string | null) ?? null,
  };
}

function fail(error: { message: string } | null): void {
  if (error) throw new AppError(400, error.message);
}

export function createSupabaseStore(): Store {
  return {
    mode: "supabase",
    async profiles() {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("profiles").select("*, profile_private(*), profile_secrets(phone_last4)");
      fail(error);
      return (data ?? []).map((row) => mapProfile(row as Row));
    },
    async profileById(id) {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("profiles").select("*, profile_private(*), profile_secrets(phone_last4)").eq("id", id).maybeSingle();
      fail(error);
      return data ? mapProfile(data as Row) : null;
    },
    async events() {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("events").select("*").is("deleted_at", null);
      fail(error);
      return (data ?? []).map((row) => mapEvent(row as Row));
    },
    async tickets() {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("ticket_types").select("*");
      fail(error);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        eventId: String(row.event_id),
        name: String(row.name),
        pricePaise: Number(row.price_paise),
        sortOrder: Number(row.sort_order),
      }));
    },
    async assignments() {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("event_staff").select("*");
      fail(error);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        eventId: String(row.event_id),
        profileId: String(row.profile_id),
        side: row.side as Assignment["side"],
        commissionPaise: row.commission_paise == null ? null : Number(row.commission_paise),
      }));
    },
    async sales() {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("sales").select("*");
      fail(error);
      return (data ?? []).map((row) => mapSale(row as Row));
    },
    async expenses() {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("expense_rows").select("*");
      fail(error);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        eventId: String(row.event_id),
        category: String(row.category),
        description: String(row.description),
        amountPaise: Number(row.amount_paise),
        createdBy: String(row.created_by),
        receiptPath: (row.receipt_path as string | null) ?? null,
        createdAt: String(row.created_at),
        deletedAt: (row.deleted_at as string | null) ?? null,
      }));
    },
    async notices(userId) {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId);
      fail(error);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        eventId: (row.event_id as string | null) ?? null,
        title: String(row.title),
        body: String(row.body),
        readAt: (row.read_at as string | null) ?? null,
        createdAt: String(row.created_at),
      }));
    },
    async audit(limit) {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
      fail(error);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        actorId: (row.actor_id as string | null) ?? null,
        action: String(row.action),
        entity: String(row.entity),
        entityId: (row.entity_id as string | null) ?? null,
        payload: (row.payload as Record<string, unknown>) ?? {},
        createdAt: String(row.created_at),
      }));
    },
    async chat(userId) {
      const supabase = await createUserClient();
      const { data, error } = await supabase.from("chat_messages").select("*").eq("user_id", userId).order("created_at");
      fail(error);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        eventId: (row.event_id as string | null) ?? null,
        role: row.role as ChatLine["role"],
        body: String(row.body),
        createdAt: String(row.created_at),
      }));
    },
    async saveChat(line) {
      const admin = createAdminClient();
      const { error } = await admin.from("chat_messages").insert({
        id: line.id,
        user_id: line.userId,
        event_id: line.eventId,
        role: line.role,
        body: line.body,
      });
      fail(error);
    },
    async markRead(id, userId) {
      const admin = createAdminClient();
      const { error } = await admin.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
      fail(error);
    },
    async addNotice(notice) {
      const admin = createAdminClient();
      const { error } = await admin.from("notifications").insert({
        id: notice.id,
        user_id: notice.userId,
        event_id: notice.eventId,
        title: notice.title,
        body: notice.body,
      });
      fail(error);
    },
    async saveSale(sale, secret) {
      const supabase = await createUserClient();
      const existing = await supabase.from("sales").select("id, status, comp_status, checked_in_at, is_comp").eq("id", sale.id).maybeSingle();
      fail(existing.error);
      if (!existing.data) {
        const { data, error } = await supabase.rpc("rvt_log_sale", {
          p_event_id: sale.eventId,
          p_guest_name: sale.guestName,
          p_ticket_type_id: sale.ticketTypeId,
          p_pr_id: sale.prId,
          p_side: sale.side,
          p_promoter_name: sale.promoterName,
          p_phone_ciphertext: secret?.phoneCiphertext ?? null,
          p_phone_hmac: secret?.phoneHmac ?? null,
          p_phone_last4: sale.phoneLast4,
          p_notes: sale.notes,
          p_proof_path: sale.proofPath,
          p_ticketing_partner_id: sale.ticketingPartnerId,
          p_collected_by: sale.collectedBy,
          p_source: sale.source,
          p_is_comp: sale.isComp,
        });
        fail(error);
        const loaded = await supabase.from("sales").select("*").eq("id", data as string).single();
        fail(loaded.error);
        return mapSale(loaded.data as Row);
      }
      if (sale.checkedInAt && !existing.data.checked_in_at) {
        const { error } = await supabase.rpc("rvt_check_in", { p_id: sale.id });
        fail(error);
      } else if (sale.isComp && sale.compStatus && sale.compStatus !== existing.data.comp_status) {
        const { error } = await supabase.rpc("rvt_review_comp", { p_id: sale.id, p_decision: sale.compStatus });
        fail(error);
      } else if (!sale.isComp && sale.status !== existing.data.status && (sale.status === "verified" || sale.status === "rejected")) {
        const { error } = await supabase.rpc("rvt_review_sale", { p_id: sale.id, p_decision: sale.status });
        fail(error);
      } else if (sale.status === "refunded" && existing.data.status !== "refunded") {
        const { error } = await supabase.rpc("rvt_refund_sale", { p_id: sale.id });
        fail(error);
      }
      const loaded = await supabase.from("sales").select("*").eq("id", sale.id).single();
      fail(loaded.error);
      return mapSale(loaded.data as Row);
    },
    async saveExpense(expense) {
      const admin = createAdminClient();
      const { error } = await admin.from("expenses").upsert({
        id: expense.id,
        event_id: expense.eventId,
        category: expense.category,
        description: expense.description,
        amount_paise: expense.amountPaise,
        created_by: expense.createdBy,
        receipt_path: expense.receiptPath,
        deleted_at: expense.deletedAt,
      });
      fail(error);
    },
    async saveEvent(event) {
      const admin = createAdminClient();
      const { error } = await admin.from("events").upsert({
        id: event.id,
        name: event.name,
        event_date: event.eventDate,
        venue: event.venue,
        starts_at: event.startsAt,
        status: event.status,
        pr_commission_paise: event.prCommissionPaise,
        bar_revenue_paise: event.barRevenuePaise,
        bar_split_bps: event.barSplitBps,
        bar_partner_name: event.barPartnerName,
        is_collab: event.isCollab,
        collab_brand: event.collabBrand,
        collab_partner_id: event.collabPartnerId,
        collab_split_bps: event.collabSplitBps,
        collab_shares: event.collabShares ?? [],
        kind: event.kind ?? "club_night",
        capacity: event.capacity ?? null,
        min_age: event.minAge ?? 18,
        alcohol: event.alcohol ?? true,
        guardian_required: event.guardianRequired ?? false,
        waitlist_count: event.waitlistCount ?? 0,
        postponed_to: event.postponedTo ?? null,
        settled_at: event.settledAt,
        created_by: event.createdBy,
        deleted_at: event.deletedAt,
      });
      fail(error);
    },
    async saveTickets(eventId, tickets) {
      const admin = createAdminClient();
      await admin.from("ticket_types").delete().eq("event_id", eventId);
      if (!tickets.length) return;
      const { error } = await admin.from("ticket_types").insert(
        tickets.map((ticket) => ({
          id: ticket.id,
          event_id: ticket.eventId,
          name: ticket.name,
          price_paise: ticket.pricePaise,
          sort_order: ticket.sortOrder,
        })),
      );
      fail(error);
    },
    async saveAssignments(eventId, rows) {
      const admin = createAdminClient();
      await admin.from("event_staff").delete().eq("event_id", eventId);
      if (!rows.length) return;
      const { error } = await admin.from("event_staff").insert(
        rows.map((row) => ({
          id: row.id,
          event_id: row.eventId,
          profile_id: row.profileId,
          side: row.side,
          commission_paise: row.commissionPaise,
          commission_bps: row.commissionBps ?? null,
        })),
      );
      fail(error);
    },
    async saveProfile(profile, secret) {
      const supabase = await createUserClient();
      const { error } = await supabase.rpc("rvt_admin_set_profile", {
        p_user_id: profile.id,
        p_role: profile.role,
        p_status: profile.status,
        p_full_name: profile.fullName,
        p_commission_bps: profile.commissionBps,
      });
      if (error) {
        const admin = createAdminClient();
        const inserted = await admin.from("profiles").upsert({
          id: profile.id,
          full_name: profile.fullName,
          role: profile.role,
          status: profile.status,
          is_owner: profile.isOwner,
          owner_slot: profile.ownerSlot,
          commission_bps: profile.commissionBps,
        });
        fail(inserted.error);
      }
      const admin = createAdminClient();
      await admin.from("profile_private").upsert({
        profile_id: profile.id,
        email: profile.email,
        instagram_handle: profile.instagram,
        college_or_workplace: profile.college,
        area: profile.area,
        referrer: profile.referrer,
        photo_path: profile.photoPath,
      });
      if (secret?.phoneCiphertext || secret?.upiCiphertext) {
        await admin.from("profile_secrets").upsert({
          profile_id: profile.id,
          phone_ciphertext: secret.phoneCiphertext,
          phone_hmac: secret.phoneHmac,
          phone_last4: profile.phoneLast4,
          upi_ciphertext: secret.upiCiphertext,
        });
      }
    },
    async writeAudit(entry) {
      const admin = createAdminClient();
      const { error } = await admin.from("audit_log").insert({
        actor_id: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId,
        payload: entry.payload,
      });
      fail(error);
    },
    async userByEmail(email) {
      const admin = createAdminClient();
      const { data, error } = await admin.from("profile_private").select("profile_id, profiles(*)").eq("email", email.toLowerCase()).maybeSingle();
      fail(error);
      if (!data) return null;
      const nested = one(data.profiles as Row | Row[]);
      const profile = mapProfile({ ...(nested ?? {}), profile_private: data });
      return { profile, passwordHash: "" };
    },
    async salePhone() {
      return null;
    },
    async savePush(sub) {
      const admin = createAdminClient();
      const { error } = await admin.from("push_subscriptions").upsert({
        id: sub.id,
        user_id: sub.userId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth_key: sub.authKey,
      });
      fail(error);
    },
    async pushesFor(userIds) {
      const admin = createAdminClient();
      const { data, error } = await admin.from("push_subscriptions").select("*").in("user_id", userIds);
      fail(error);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        endpoint: String(row.endpoint),
        p256dh: String(row.p256dh),
        authKey: String(row.auth_key),
        createdAt: String(row.created_at),
      }));
    },
    async putFile(path, file) {
      const admin = createAdminClient();
      const [bucket, ...rest] = path.split("/");
      const { error } = await admin.storage.from(bucket).upload(rest.join("/"), file.bytes, {
        contentType: file.type,
        upsert: false,
      });
      fail(error);
    },
    async getFile() {
      return null;
    },
  };
}
