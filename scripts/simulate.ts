import { mkdirSync, writeFileSync } from "node:fs";
import { EVENT_KINDS, SALES_COMBOS } from "@/domain/types";
import { runMatrix, summaryMarkdown } from "@/sim/matrix";

const result = runMatrix();
const markdown = summaryMarkdown(result);
const dir = process.env.SIM_OUT || "/opt/cursor/artifacts";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/simulation-summary.md`, markdown);
const failed = result.rows.filter((row) => !row.reconciled);
console.log(markdown);
console.log(JSON.stringify({
  events: result.rows.length,
  kinds: EVENT_KINDS.length,
  combos: SALES_COMBOS.length,
  notices: result.notices,
  ms: result.ms,
  failed: failed.length,
  collabLeaks: result.rows.filter((row) => row.collabSeesPrNames).length,
}));
if (failed.length || result.rows.some((row) => row.collabSeesPrNames)) process.exit(1);
