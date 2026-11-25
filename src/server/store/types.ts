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

export type SecretUpdate = {
  phoneCiphertext?: string;
  phoneHmac?: string;
  upiCiphertext?: string;
  phonePlain?: string;
};

export type StoredFile = { bytes: Uint8Array; type: string; ownerId: string };

export interface Store {
  mode: "memory" | "supabase";
  profiles(): Promise<Profile[]>;
  events(): Promise<EventRow[]>;
  tickets(): Promise<TicketType[]>;
  assignments(): Promise<Assignment[]>;
  sales(): Promise<Sale[]>;
  expenses(): Promise<Expense[]>;
  notices(userId: string): Promise<Notice[]>;
  audit(limit: number): Promise<AuditEntry[]>;
  chat(userId: string): Promise<ChatLine[]>;
  saveChat(line: ChatLine): Promise<void>;
  markRead(id: string, userId: string): Promise<void>;
  addNotice(notice: Notice): Promise<void>;
  saveSale(sale: Sale, secret?: SecretUpdate): Promise<Sale>;
  saveExpense(expense: Expense): Promise<void>;
  saveEvent(event: EventRow): Promise<void>;
  saveTickets(eventId: string, tickets: TicketType[]): Promise<void>;
  saveAssignments(eventId: string, rows: Assignment[]): Promise<void>;
  saveProfile(profile: Profile, secret?: SecretUpdate & { passwordHash?: string }): Promise<void>;
  writeAudit(entry: Omit<AuditEntry, "id" | "createdAt">): Promise<void>;
  userByEmail(email: string): Promise<{ profile: Profile; passwordHash: string } | null>;
  salePhone(saleId: string): Promise<string | null>;
  savePush(sub: PushSub): Promise<void>;
  pushesFor(userIds: string[]): Promise<PushSub[]>;
  putFile(path: string, file: StoredFile): Promise<void>;
  getFile(path: string): Promise<StoredFile | null>;
}
