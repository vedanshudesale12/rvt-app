import type { Metadata } from "next";
import { APP } from "@/config/brand";

export const metadata: Metadata = {
  title: "Request a login",
  description: `Ask ${APP.org} for a ${APP.name} login. PRs are active immediately. Ticketing and collab wait for an admin.`,
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
