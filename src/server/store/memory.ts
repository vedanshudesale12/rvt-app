import type {
  Assignment,
  AuditEntry,
  ChatLine,
  EventRow,
  Expense,
  Notice,
  Profile,
  PushSub,
  Sale,
  TicketType,
} from "@/domain/types";
import type { Store, StoredFile } from "@/server/store/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type MemorySeed = {
  profiles: Profile[];
  events: EventRow[];
  tickets: TicketType[];
  assignments: Assignment[];
  sales: Sale[];
  expenses: Expense[];
  phones?: Record<string, string>;
  passwords?: Record<string, string>;
};

export function createMemoryStore(seed: MemorySeed): Store {
  const profiles = new Map(seed.profiles.map((row) => [row.id, clone(row)]));
  const events = new Map(seed.events.map((row) => [row.id, clone(row)]));
  const tickets = new Map(seed.tickets.map((row) => [row.id, clone(row)]));
  const assignments = new Map(seed.assignments.map((row) => [row.id, clone(row)]));
  const sales = new Map(seed.sales.map((row) => [row.id, clone(row)]));
  const expenses = new Map(seed.expenses.map((row) => [row.id, clone(row)]));
  const phones = new Map(Object.entries(seed.phones ?? {}));
  const passwords = new Map(Object.entries(seed.passwords ?? {}));
  const notices: Notice[] = [];
  const audits: AuditEntry[] = [];
  const chats: ChatLine[] = [];
  const pushes: PushSub[] = [];
  const files = new Map<string, StoredFile>();
  const phoneSecrets = new Map<string, { ciphertext?: string; hmac?: string }>();

  return {
    mode: "memory",
    async profiles() {
      return [...profiles.values()].filter((row) => !row.deletedAt);
    },
    async profileById(id) {
      const row = profiles.get(id);
      return row && !row.deletedAt ? row : null;
    },
    async events() {
      return [...events.values()].filter((row) => !row.deletedAt);
    },
    async tickets() {
      return [...tickets.values()];
    },
    async assignments() {
      return [...assignments.values()];
    },
    async sales() {
      return [...sales.values()].filter((row) => !row.deletedAt);
    },
    async expenses() {
      return [...expenses.values()].filter((row) => !row.deletedAt);
    },
    async notices(userId) {
      return notices.filter((row) => row.userId === userId);
    },
    async audit(limit) {
      return audits.slice(-limit).reverse();
    },
    async chat(userId) {
      return chats.filter((row) => row.userId === userId);
    },
    async saveChat(line) {
      chats.push(line);
    },
    async markRead(id, userId) {
      const notice = notices.find((row) => row.id === id && row.userId === userId);
      if (notice) notice.readAt = new Date().toISOString();
    },
    async addNotice(notice) {
      notices.push(notice);
    },
    async saveSale(sale, secret) {
      sales.set(sale.id, clone(sale));
      if (secret?.phonePlain) phones.set(sale.id, secret.phonePlain);
      if (secret?.phoneCiphertext || secret?.phoneHmac) {
        phoneSecrets.set(sale.id, { ciphertext: secret.phoneCiphertext, hmac: secret.phoneHmac });
      }
      return clone(sale);
    },
    async saveExpense(expense) {
      expenses.set(expense.id, clone(expense));
    },
    async saveEvent(event) {
      events.set(event.id, clone(event));
    },
    async saveTickets(eventId, next) {
      for (const [id, ticket] of tickets) {
        if (ticket.eventId === eventId) tickets.delete(id);
      }
      for (const ticket of next) tickets.set(ticket.id, clone(ticket));
    },
    async saveAssignments(eventId, rows) {
      for (const [id, row] of assignments) {
        if (row.eventId === eventId) assignments.delete(id);
      }
      for (const row of rows) assignments.set(row.id, clone(row));
    },
    async saveProfile(profile, secret) {
      profiles.set(profile.id, clone(profile));
      if (secret?.passwordHash && profile.email) passwords.set(profile.email.toLowerCase(), secret.passwordHash);
    },
    async writeAudit(entry) {
      audits.push({ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    },
    async userByEmail(email) {
      const profile = [...profiles.values()].find((row) => row.email.toLowerCase() === email.toLowerCase());
      if (!profile) return null;
      return { profile: clone(profile), passwordHash: passwords.get(email.toLowerCase()) ?? "" };
    },
    async salePhone(saleId) {
      return phones.get(saleId) ?? null;
    },
    async savePush(sub) {
      pushes.push(sub);
    },
    async pushesFor(userIds) {
      return pushes.filter((row) => userIds.includes(row.userId));
    },
    async putFile(path, file) {
      files.set(path, file);
    },
    async getFile(path) {
      return files.get(path) ?? null;
    },
  };
}
