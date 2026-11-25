/**
 * Short door and dashboard burst. No extra dependency.
 * DOOR_SECONDS=5 BASE_URL=http://127.0.0.1:3000 node scripts/load.mjs
 * A k6 script with the same paths is scripts/load.k6.js.
 */
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const seconds = Number(process.env.DOOR_SECONDS || 5);
const rps = Number(process.env.DOOR_RPS || 20);

async function probe(path) {
  const started = performance.now();
  const response = await fetch(base + path);
  return { ms: performance.now() - started, status: response.status };
}

const samples = [];
const until = Date.now() + seconds * 1000;
while (Date.now() < until) {
  const batch = Array.from({ length: rps }, () => probe("/api/health"));
  samples.push(...(await Promise.all(batch)));
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
const times = samples.map((row) => row.ms).sort((a, b) => a - b);
const errors = samples.filter((row) => row.status >= 500).length;
const pct = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))] ?? 0;
console.log(JSON.stringify({ requests: samples.length, errors, p50: Math.round(pct(0.5)), p95: Math.round(pct(0.95)) }));
if (errors > samples.length * 0.01) process.exit(1);
