import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource/archivo-narrow/700.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import { APP } from "@/config/brand";
import { CookieNotice } from "@/components/bits";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP.name, template: `%s · ${APP.name}` },
  description: APP.description,
  applicationName: APP.name,
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  icons: { icon: "/icons/favicon-32.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: APP.shortName, statusBarStyle: "black-translucent" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
          <script nonce={nonce} src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
        ) : null}
      </head>
      <body>
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
