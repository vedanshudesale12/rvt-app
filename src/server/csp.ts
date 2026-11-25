/**
 * Document CSP. Next reads `x-nonce` on the request and stamps its inline scripts.
 * A nonce makes browsers ignore 'unsafe-inline', so both dev and production use the nonce.
 * Dev still allows eval for the bundler. upgrade-insecure-requests is HTTPS only.
 */
export function contentSecurityPolicy(options: { dev: boolean; https: boolean; nonce: string }): string {
  const scriptSrc = options.dev
    ? `script-src 'self' 'nonce-${options.nonce}' 'unsafe-eval' https://challenges.cloudflare.com`
    : `script-src 'self' 'nonce-${options.nonce}' https://challenges.cloudflare.com`;
  const connectSrc = options.dev
    ? "connect-src 'self' http: ws: wss: https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://*.ingest.sentry.io"
    : "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://*.ingest.sentry.io";
  const directives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    connectSrc,
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!options.dev && options.https) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
