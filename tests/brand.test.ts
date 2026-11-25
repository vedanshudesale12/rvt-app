import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APP } from "@/config/brand";

function files(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git" || entry === "test-results" || entry === "playwright-report" || entry === "coverage") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files(full, found);
    else if (/\.(ts|tsx|js|mjs|md|css|json|html)$/.test(entry)) found.push(full);
  }
  return found;
}

describe("product name", () => {
  it("lives in one config object", () => {
    expect(APP.name).toBe("Backstage RVT");
    expect(APP.shortName).toBe("Backstage");
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain(APP.name);
    expect(readme).toContain(APP.shortName);
    const allowed = new Set([
      path.normalize("src/config/brand.ts"),
      path.normalize("README.md"),
      path.normalize("tests/brand.test.ts"),
    ]);
    const leaks = files(".").filter((file) => {
      const rel = path.normalize(file);
      if (allowed.has(rel)) return false;
      return readFileSync(file, "utf8").includes(APP.name);
    });
    expect(leaks).toEqual([]);
  });
});
