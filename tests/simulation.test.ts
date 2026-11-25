import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVENT_KINDS, SALES_COMBOS } from "@/domain/types";
import { runMatrix, summaryMarkdown } from "@/sim/matrix";

describe("event matrix", () => {
  it("reconciles every event type with every sales channel", () => {
    const result = runMatrix();
    const dir = "/opt/cursor/artifacts";
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/simulation-summary.md`, summaryMarkdown(result));
    expect(result.rows).toHaveLength(EVENT_KINDS.length * SALES_COMBOS.length);
    const pairs = new Set(result.rows.map((row) => `${row.kind}:${row.combo}`));
    expect(pairs.size).toBe(result.rows.length);
    const failed = result.rows.filter((row) => !row.reconciled);
    expect(failed.map((row) => `${row.event}: ${row.reason}`)).toEqual([]);
    expect(result.rows.some((row) => row.collabSeesPrNames)).toBe(false);
    expect(result.notices).toBe(result.rows.length * 4);
    expect(result.ms).toBeLessThan(20_000);
  });
});
