import { APP } from "@/config/brand";
import { Legal } from "@/components/legal";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <Legal title="Terms">
      <p>Draft for staff of {APP.org}. Not a substitute for a lawyer. {APP.name} is an internal tool for guest lists, the door, and who owes what. It is not a ticket shop and it does not move money.</p>
      <p>You must be 18 or older. You only log guests you actually dealt with. Comps do not enter until an admin approves them. Amounts, roles, and verification are set on the server. Do not share your login. We can disable it.</p>
      <p>Commissions and the 50-50 between the owners are operational records. A collab partner sees their event, not the names of RVT PRs. When that event is settled, the collab login is turned off.</p>
      <p>The app is provided as-is for this company. Indian law applies. Disputes sit with the courts at Pune.</p>
    </Legal>
  );
}
