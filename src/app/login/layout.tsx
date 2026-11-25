import type { Metadata } from "next";
import { APP } from "@/config/brand";

export const metadata: Metadata = {
  title: "Log in",
  description: `Staff login for ${APP.name}. Guest lists, the door, and who owes what. 18+.`,
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
