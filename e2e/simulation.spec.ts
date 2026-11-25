import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

test("event matrix reconciles to the rupee", () => {
  test.skip(test.info().project.name !== "chromium-desktop", "the matrix runs once");
  const out = execFileSync("npx", ["vite-node", "--config", "vitest.config.ts", "scripts/simulate.ts"], {
    encoding: "utf8",
    cwd: process.cwd(),
  });
  const line = out.trim().split("\n").at(-1) ?? "";
  const summary = JSON.parse(line) as { events: number; failed: number; collabLeaks: number; ms: number };
  expect(summary.failed).toBe(0);
  expect(summary.collabLeaks).toBe(0);
  expect(summary.events).toBeGreaterThan(100);
  expect(out).toContain("| club_night | rvt_solo |");
  expect(out).toContain("| sold_out | venue_bar |");
  console.log(line);
});
