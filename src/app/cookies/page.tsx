import { APP } from "@/config/brand";
import { Legal } from "@/components/legal";

export const metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <Legal title="Cookie Policy">
      <p>{APP.name} uses essential cookies only.</p>
      <ul className="list-disc pl-5">
        <li>Session cookie, so a copied link does not log someone in.</li>
        <li>A security token checked on every save.</li>
        <li>The event you currently have open.</li>
        <li>A note that you saw this cookies line.</li>
      </ul>
      <p>There are no advertising or analytics cookies. The session cookie is httpOnly, Secure on HTTPS, and SameSite=Lax. You are logged out after {APP.idleMinutes} minutes idle.</p>
    </Legal>
  );
}
