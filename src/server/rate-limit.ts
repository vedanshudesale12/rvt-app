type Bucket = { start: number; hits: number };
const buckets = new Map<string, Bucket>();

export function resetRateLimits(): void {
  buckets.clear();
}

export function memoryHit(bucket: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = buckets.get(bucket);
  if (!current || now - current.start >= windowMs) {
    buckets.set(bucket, { start: now, hits: 1 });
    return true;
  }
  current.hits += 1;
  return current.hits <= limit;
}

export async function hitLimit(bucket: string, limit: number, windowMs: number): Promise<void> {
  const { AppError } = await import("@/domain/errors");
  const allowed = memoryHit(bucket, limit, windowMs);
  if (!allowed) throw new AppError(429, "Too many tries. Wait a minute and try again.");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  try {
    const { createAdminClient } = await import("@/server/supabase");
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rvt_rate_hit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (!error && data === false) throw new AppError(429, "Too many tries. Wait a minute and try again.");
  } catch (error) {
    if (error instanceof AppError) throw error;
  }
}
