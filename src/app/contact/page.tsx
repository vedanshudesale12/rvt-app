import { APP } from "@/config/brand";
import { Legal } from "@/components/legal";

export const metadata = {
  title: "Contact",
  description: `Write to ${APP.org} about ${APP.name}, your account, or a grievance.`,
};

export default function ContactPage() {
  return (
    <Legal title="Contact">
      <p>Staff questions, account changes, and grievances go to the same desk.</p>
      <p>
        Email <a className="underline" href={`mailto:${APP.contactEmail}`}>{APP.contactEmail}</a>.
      </p>
    </Legal>
  );
}
