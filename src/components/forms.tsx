"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP } from "@/config/brand";
import { api } from "@/components/use-api";

type Ticket = { id: string; name: string; pricePaise: number };
type Pr = { id: string; fullName: string };

export function GuestForm({ eventId, tickets, prs, showPr, collabName }: { eventId: string; tickets: Ticket[]; prs: Pr[]; showPr: boolean; collabName?: string }) {
  const [error, setError] = useState("");
  const [side, setSide] = useState("rvt");
  return (
    <form
      className="grid gap-3 border border-line bg-panel p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const form = new FormData(event.currentTarget);
        try {
          let proofPath: string | undefined;
          const file = form.get("proof");
          if (file instanceof File && file.size) {
            const upload = new FormData();
            upload.set("file", file);
            upload.set("bucket", "proofs");
            const saved = await api("/api/uploads", undefined, upload);
            proofPath = saved.path;
          }
          await api("/api/rpc", {
            action: "logSale",
            payload: {
              eventId,
              guestName: form.get("guestName"),
              phone: form.get("phone"),
              ticketTypeId: form.get("ticketTypeId"),
              notes: form.get("notes") || undefined,
              prId: collabName ? undefined : form.get("prId") || undefined,
              side: collabName ? "collab" : side,
              promoterName: collabName || form.get("promoterName") || undefined,
              collectedBy: collabName ? "company" : form.get("collectedBy") || undefined,
              ticketingPartnerId: collabName ? undefined : form.get("ticketingPartnerId") || undefined,
              proofPath,
              ageConfirmed: form.get("age") === "on" ? true : undefined,
            },
          });
          window.location.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save");
        }
      }}
    >
      <p className="display text-xl">Add a guest</p>
      <div className="grid gap-3 md:grid-cols-2">
        <input name="guestName" required placeholder="Name" className="border border-line px-3 py-2" />
        <input name="phone" required placeholder="Phone" className="border border-line px-3 py-2" />
        <select name="ticketTypeId" className="border border-line px-3 py-2" defaultValue={tickets[0]?.id}>
          {tickets.map((ticket) => (
            <option key={ticket.id} value={ticket.id}>{ticket.name}</option>
          ))}
        </select>
        {showPr && !collabName && side === "rvt" && (
          <select name="prId" className="border border-line px-3 py-2" defaultValue={prs[0]?.id}>
            {prs.map((pr) => (
              <option key={pr.id} value={pr.id}>{pr.fullName}</option>
            ))}
          </select>
        )}
        {showPr && !collabName && (
          <select name="side" className="border border-line px-3 py-2" value={side} onChange={(event) => setSide(event.target.value)}>
            <option value="rvt">RVT</option>
            <option value="collab">Collab promoter</option>
          </select>
        )}
        {!collabName && side === "collab" && <input name="promoterName" placeholder="Their promoter" className="border border-line px-3 py-2" />}
        {!collabName && <select name="collectedBy" className="border border-line px-3 py-2" defaultValue="pr">
          <option value="pr">PR collected</option>
          <option value="company">Company collected</option>
          <option value="ticketing_partner">Ticketing partner collected</option>
        </select>}
        <input name="notes" placeholder="Note" className="border border-line px-3 py-2" />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input name="age" type="checkbox" required />
          Guest is 18 or older
        </label>
        <label className="text-sm text-muted">
          UPI screenshot
          <input name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full" />
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" className="bg-ink px-4 py-2 text-paper">Save to pending</button>
    </form>
  );
}

export function CompForm({ eventId, tickets, prs, showPr }: { eventId: string; tickets: Ticket[]; prs: Pr[]; showPr: boolean }) {
  const [error, setError] = useState("");
  return (
    <form
      className="grid gap-3 border border-line bg-panel p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
          await api("/api/rpc", {
            action: "requestComp",
            payload: {
              eventId,
              guestName: form.get("guestName"),
              phone: form.get("phone"),
              ticketTypeId: form.get("ticketTypeId"),
              notes: form.get("notes") || undefined,
              prId: form.get("prId") || undefined,
              ageConfirmed: form.get("age") === "on" ? true : undefined,
            },
          });
          window.location.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save");
        }
      }}
    >
      <p className="display text-xl">Ask for a comp</p>
      <p className="text-sm text-muted">It does not get them in until an admin says yes.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <input name="guestName" required placeholder="Name" className="border border-line px-3 py-2" />
        <input name="phone" required placeholder="Phone" className="border border-line px-3 py-2" />
        <select name="ticketTypeId" className="border border-line px-3 py-2">{tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.name}</option>)}</select>
        {showPr && <select name="prId" className="border border-line px-3 py-2">{prs.map((pr) => <option key={pr.id} value={pr.id}>{pr.fullName}</option>)}</select>}
        <input name="notes" placeholder="Why" className="border border-line px-3 py-2 md:col-span-2" />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input name="age" type="checkbox" required />
          Guest is 18 or older
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" className="border border-ink px-4 py-2">Request comp</button>
    </form>
  );
}

export function ExpenseForm({ eventId }: { eventId: string }) {
  const [error, setError] = useState("");
  return (
    <form
      className="grid gap-3 border border-line bg-panel p-4 md:grid-cols-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
          await api("/api/rpc", {
            action: "addExpense",
            payload: {
              eventId,
              category: form.get("category"),
              description: form.get("description"),
              amountRupees: Number(form.get("amountRupees")),
            },
          });
          window.location.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save");
        }
      }}
    >
      <input name="category" required placeholder="Category" className="border border-line px-3 py-2" />
      <input name="description" required placeholder="What was it" className="border border-line px-3 py-2" />
      <input name="amountRupees" required type="number" min="0" step="1" placeholder="Rupees" className="border border-line px-3 py-2" />
      <button type="submit" className="bg-ink px-4 py-2 text-paper">Add expense</button>
      {error && <p className="text-sm text-danger md:col-span-4">{error}</p>}
    </form>
  );
}

export function ChatPanel({ eventId }: { eventId: string | null }) {
  const router = useRouter();
  const [lines, setLines] = useState<{ who: string; text: string }[]>([]);
  const [preview, setPreview] = useState<{ guestName: string; phone: string; ticketTypeId: string; ticketTypeName: string }[]>([]);
  const [error, setError] = useState("");
  return (
    <div className="grid gap-4">
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const message = String(form.get("message") || "");
          setLines((current) => [...current, { who: "You", text: message }]);
          try {
            const result = await api("/api/rpc", { action: "chat", payload: { eventId, message } });
            if (result.type === "preview") setPreview(result.rows);
            else setLines((current) => [...current, { who: APP.shortName, text: result.text }]);
            event.currentTarget.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Chat failed");
          }
        }}
      >
        <textarea name="message" required rows={5} placeholder="Paste a list, or ask about tonight" className="border border-line bg-panel px-3 py-2" />
        <button type="submit" className="justify-self-start bg-ink px-4 py-2 text-paper">Send</button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="grid gap-2">
        {lines.map((line, index) => (
          <p key={index} className="border border-line bg-panel px-3 py-2 text-sm"><span className="text-muted">{line.who}. </span>{line.text}</p>
        ))}
      </div>
      {preview.length > 0 && (
        <div className="border border-line bg-panel p-4">
          <p className="display text-xl">Check this list</p>
          <ul className="mt-3 divide-y divide-line">
            {preview.map((row) => (
              <li key={`${row.phone}-${row.guestName}`} className="flex justify-between py-2 text-sm">
                <span>{row.guestName}</span>
                <span>{row.ticketTypeName} · {row.phone.slice(-4)}</span>
              </li>
            ))}
          </ul>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input id="bulk-age" type="checkbox" />
            Everyone on this list is 18 or older
          </label>
          <button
            type="button"
            className="mt-3 bg-ink px-4 py-2 text-paper"
            onClick={async () => {
              if (!eventId) return;
              const age = (document.getElementById("bulk-age") as HTMLInputElement | null)?.checked;
              if (!age) {
                setError("Confirm everyone on the list is 18 or older");
                return;
              }
              await api("/api/rpc", { action: "logBulk", payload: { eventId, ageConfirmed: true, rows: preview.map(({ guestName, phone, ticketTypeId }) => ({ guestName, phone, ticketTypeId })) } });
              router.push("/guests");
              router.refresh();
            }}
          >
            Save as pending
          </button>
        </div>
      )}
    </div>
  );
}

export function DoorBoard({ eventId }: { eventId: string }) {
  const [query, setQuery] = useState("");
  const [guests, setGuests] = useState<{ id: string; guestName: string; ticketTypeName: string; phoneLast4: string; checkedInAt: string | null; isComp: boolean; compStatus: string | null; status: string }[]>([]);
  const [inside, setInside] = useState(0);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let stop = false;
    const load = () => {
      fetch(`/api/door?event=${eventId}&q=${encodeURIComponent(query)}`, { credentials: "same-origin" })
        .then((response) => response.json())
        .then((data) => {
          if (!stop) {
            setGuests(data.guests ?? []);
            setInside(typeof data.checkedIn === "number" ? data.checkedIn : 0);
          }
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [eventId, query]);

  return (
    <div>
      <p className="num text-4xl">{inside} inside</p>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or phone" className="mt-3 w-full border border-ink bg-panel px-3 py-4 text-lg" />
      {flash && <p className="mt-3 border border-ink px-3 py-3 text-lg">{flash}</p>}
      <ul className="mt-3 divide-y divide-line border border-line bg-panel">
        {guests.map((guest) => (
          <li key={guest.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-4 text-left"
              onClick={async () => {
                try {
                  const result = await api("/api/rpc", { action: "checkIn", payload: { saleId: guest.id } });
                  if (result.result === "already_inside") {
                    const time = new Date(result.checkedInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                    setFlash(`Already inside · ${time}`);
                  } else if (result.result === "inside") setFlash(`${guest.guestName} is in`);
                  else if (result.result === "not_approved") setFlash("Comp is not approved");
                  else setFlash("Not verified yet");
                } catch (err) {
                  setFlash(err instanceof Error ? err.message : "Could not check in");
                }
              }}
            >
              <span>
                <span className="display block text-2xl">{guest.guestName}</span>
                <span className="text-sm text-muted">{guest.ticketTypeName} · {guest.phoneLast4}</span>
              </span>
              <span className="text-sm uppercase tracking-wider">{guest.checkedInAt ? "Inside" : guest.isComp ? guest.compStatus : guest.status}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EventForm({ prs, partners, ticketing = [] }: { prs: Pr[]; partners: Pr[]; ticketing?: Pr[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [collab, setCollab] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const prIds = prs.filter((pr) => form.get(`pr-${pr.id}`) === "on").map((pr) => pr.id);
        const ticketingPartners = ticketing.filter((partner) => form.get(`tp-${partner.id}`) === "on").map((partner) => ({
          id: partner.id,
          flatRupees: Number(form.get(`tp-flat-${partner.id}`) || 100),
          percent: form.get(`tp-pct-${partner.id}`) === "" ? null : Number(form.get(`tp-pct-${partner.id}`)),
        }));
        try {
          await api("/api/rpc", {
            action: "saveEvent",
            payload: {
              name: form.get("name"),
              eventDate: form.get("eventDate"),
              venue: form.get("venue"),
              time: form.get("time"),
              status: "published",
              prCommissionRupees: Number(form.get("commission")),
              barRevenueRupees: Number(form.get("bar") || 0),
              barSplitPercent: Number(form.get("barSplit") || 0),
              barPartnerName: form.get("barPartner") || "",
              isCollab: collab,
              collabBrand: form.get("brand") || "",
              collabPartnerId: form.get("partner") || null,
              collabSplitPercent: Number(form.get("split") || 0),
              ticketTypes: [
                { name: "Male", priceRupees: Number(form.get("male")) },
                { name: "Female", priceRupees: Number(form.get("female")) },
              ],
              prIds,
              ticketingPartners,
            },
          });
          router.push("/events");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save");
        }
      }}
    >
      <input name="name" required placeholder="Event name" className="border border-line px-3 py-2" />
      <div className="grid gap-3 md:grid-cols-3">
        <input name="eventDate" required type="date" className="border border-line px-3 py-2" />
        <input name="time" required type="time" defaultValue="21:00" className="border border-line px-3 py-2" />
        <input name="venue" required placeholder="Venue" className="border border-line px-3 py-2" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input name="male" required type="number" min="0" placeholder="Male price ₹" className="border border-line px-3 py-2" />
        <input name="female" required type="number" min="0" placeholder="Female price ₹" className="border border-line px-3 py-2" />
        <input name="commission" required type="number" min="0" placeholder="PR cut ₹ per ticket" className="border border-line px-3 py-2" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input name="bar" type="number" min="0" placeholder="Bar takings ₹" className="border border-line px-3 py-2" />
        <input name="barSplit" type="number" min="0" max="100" placeholder="Bar share %" className="border border-line px-3 py-2" />
        <input name="barPartner" placeholder="Bar partner" className="border border-line px-3 py-2" />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={collab} onChange={(event) => setCollab(event.target.checked)} /> Collab event</label>
      {collab && (
        <div className="grid gap-3 md:grid-cols-3">
          <input name="brand" placeholder="Their brand" className="border border-line px-3 py-2" />
          <select name="partner" className="border border-line px-3 py-2">
            <option value="">Partner login</option>
            {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.fullName}</option>)}
          </select>
          <input name="split" type="number" min="0" max="100" placeholder="Their profit %" className="border border-line px-3 py-2" />
        </div>
      )}
      {ticketing.length > 0 && (
        <fieldset className="border border-line p-3">
          <legend className="px-1 text-sm">Ticketing partners</legend>
          <div className="grid gap-3">
            {ticketing.map((partner) => (
              <label key={partner.id} className="grid gap-2 text-sm md:grid-cols-[1fr_120px_120px] md:items-center">
                <span className="flex items-center gap-2"><input type="checkbox" name={`tp-${partner.id}`} /> {partner.fullName}</span>
                <input name={`tp-flat-${partner.id}`} type="number" min="0" defaultValue="100" className="border border-line px-2 py-1" aria-label={`${partner.fullName} rupees per guest`} />
                <input name={`tp-pct-${partner.id}`} type="number" min="0" max="100" placeholder="Their %" className="border border-line px-2 py-1" aria-label={`${partner.fullName} percent`} />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Flat rupees per paying guest, default 100, plus a percent of their ticket money. Leave the percent blank to use the rate on the partner.</p>
        </fieldset>
      )}
      <fieldset className="border border-line p-3">
        <legend className="px-1 text-sm">PRs on this event</legend>
        <div className="grid gap-2 md:grid-cols-2">
          {prs.map((pr) => (
            <label key={pr.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name={`pr-${pr.id}`} defaultChecked /> {pr.fullName}</label>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" className="justify-self-start bg-ink px-4 py-2 text-paper">Publish and tell the PRs</button>
    </form>
  );
}

export function PeopleForms({ people }: { people: { id: string; fullName: string; status: string; role: string | null }[] }) {
  const [error, setError] = useState("");
  return (
    <div className="grid gap-6">
      <form
        className="grid gap-3 border border-line bg-panel p-4 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await api("/api/rpc", {
              action: "createStaff",
              payload: {
                fullName: form.get("fullName"),
                email: form.get("email"),
                phone: form.get("phone"),
                password: form.get("password"),
                role: form.get("role"),
              },
            });
            window.location.reload();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add them");
          }
        }}
      >
        <p className="display text-xl md:col-span-2">Door or data entry</p>
        <input name="fullName" required placeholder="Name" className="border border-line px-3 py-2" />
        <input name="email" required type="email" placeholder="Email" className="border border-line px-3 py-2" />
        <input name="phone" required placeholder="Phone" className="border border-line px-3 py-2" />
        <input name="password" required type="password" minLength={8} placeholder="Password" className="border border-line px-3 py-2" />
        <select name="role" className="border border-line px-3 py-2"><option value="door">Door</option><option value="data_entry">Data entry</option></select>
        <button type="submit" className="bg-ink px-4 py-2 text-paper">Create login</button>
        {error && <p className="text-sm text-danger md:col-span-2">{error}</p>}
      </form>
      <ul className="divide-y divide-line border border-line bg-panel">
        {people.map((person) => (
          <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <span>{person.fullName}<span className="ml-2 text-xs uppercase tracking-wider text-muted">{person.role} · {person.status}</span></span>
            <span className="flex gap-2">
              {person.status !== "active" && <Mini action="setUser" payload={{ id: person.id, status: "active" }} label="Approve" />}
              {person.status !== "disabled" && <Mini action="setUser" payload={{ id: person.id, status: "disabled" }} label="Disable" />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Mini({ action, payload, label }: { action: string; payload: Record<string, unknown>; label: string }) {
  return (
    <button type="button" className="border border-ink px-2 py-1 text-sm" onClick={async () => { await api("/api/rpc", { action, payload }); window.location.reload(); }}>
      {label}
    </button>
  );
}
