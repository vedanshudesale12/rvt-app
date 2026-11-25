import { guestParseSchema } from "@/domain/schemas";
import { cleanText, normalizePhone } from "@/domain/text";
import type { TicketType } from "@/domain/types";

export type ParsedGuest = { guestName: string; phone: string; ticketTypeId: string };

function matchTicket(label: string, tickets: TicketType[]): TicketType | undefined {
  const needle = label.trim().toLowerCase();
  return tickets.find((ticket) => ticket.name.toLowerCase() === needle);
}

export function parseGuestList(text: string, tickets: TicketType[]): { rows: ParsedGuest[]; errors: string[] } {
  const rows: ParsedGuest[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  lines.forEach((line, index) => {
    if (/^(name|guest)\b/i.test(line)) return;
    const parts = line.split(/[,|;\t]| - /).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) {
      errors.push(`Line ${index + 1} needs a name and a phone`);
      return;
    }
    const phonePart = parts.find((part) => part.replace(/\D/g, "").length >= 8);
    if (!phonePart) {
      errors.push(`Line ${index + 1} has no phone`);
      return;
    }
    const rest = parts.filter((part) => part !== phonePart);
    const typePart = rest.find((part) => matchTicket(part, tickets));
    const namePart = rest.find((part) => part !== typePart) ?? rest[0];
    const ticket = typePart ? matchTicket(typePart, tickets) : tickets[0];
    if (!ticket || !namePart) {
      errors.push(`Line ${index + 1} needs a ticket type`);
      return;
    }
    try {
      rows.push({
        guestName: cleanText(namePart, 120),
        phone: normalizePhone(phonePart),
        ticketTypeId: ticket.id,
      });
    } catch (error) {
      errors.push(`Line ${index + 1}: ${error instanceof Error ? error.message : "Bad row"}`);
    }
  });
  return { rows, errors };
}

export function guestsFromModel(payload: unknown, tickets: TicketType[]): ParsedGuest[] {
  const parsed = guestParseSchema.parse(payload);
  return parsed.guests.map((guest, index) => {
    const ticket = matchTicket(guest.ticketType, tickets);
    if (!ticket) throw new Error(`Row ${index + 1} uses an unknown ticket type`);
    return {
      guestName: cleanText(guest.guestName, 120),
      phone: normalizePhone(guest.phone),
      ticketTypeId: ticket.id,
    };
  });
}
