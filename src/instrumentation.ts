export async function register() {
  if (process.env.NODE_ENV === "production" && process.env.RVT_DEMO === "1") {
    throw new Error("RVT_DEMO must not be set in production");
  }
  if (process.env.NODE_ENV === "production" && process.env.TURNSTILE_BYPASS === "1") {
    throw new Error("TURNSTILE_BYPASS must not be set in production");
  }
}
