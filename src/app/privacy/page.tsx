import { APP } from "@/config/brand";
import { Legal } from "@/components/legal";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  const contact = process.env.LEGAL_CONTACT_EMAIL || "the address in LEGAL_CONTACT_EMAIL";
  return (
    <Legal title="Privacy Policy">
      <p>This is a working draft for the Digital Personal Data Protection Act, 2023. Have a lawyer read it before you rely on it. {APP.org} is the data fiduciary for {APP.name}.</p>
      <p>We collect name, phone, email, password, Instagram handle, college or workplace, area, UPI ID, a photo, referrer, guest lists, payment screenshots, and staff actions. We do not collect date of birth. Every user and guest is 18 or older. Do not put a minor on a list.</p>
      <p>We use this data to run events: guest lists, door check-in, commissions, and settle-up. Chat messages you send may be processed by Google Gemini when an API key is configured. Email goes through Resend. The app is hosted on Cloudflare and the database is Supabase. That can mean processing outside India. We do not sell personal data.</p>
      <p>Phone numbers and UPI IDs are encrypted before they are stored. Payment screenshots sit in a private bucket and are opened with short-lived links.</p>
      <p>You can ask to access, correct, or erase your account, and you can nominate someone, by writing to {contact}. We keep event records while the books for that night are still needed, then soft-delete them. An admin can disable a login.</p>
      <p>Grievance contact: {contact}.</p>
    </Legal>
  );
}
