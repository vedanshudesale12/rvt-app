import { describe, expect, it } from "vitest";
import rule from "../eslint/no-banned-classes.mjs";

function run(className: string) {
  const messages: { message: string }[] = [];
  const visitor = rule.create({
    report(entry: { message: string }) {
      messages.push(entry);
    },
  });
  visitor.Literal({
    value: className,
    parent: { type: "JSXAttribute", name: { name: "className" } },
  });
  return messages;
}

describe("design lint", () => {
  it("fails banned utility classes", () => {
    expect(run("bg-indigo-500 rounded-2xl from-purple-500 bg-gradient-to-r shadow-lg").length).toBeGreaterThan(0);
    expect(run("bg-violet-600").length).toBeGreaterThan(0);
    expect(run("rounded-3xl").length).toBeGreaterThan(0);
  });

  it("allows the ink and accent tokens", () => {
    expect(run("bg-ink text-accent border-line")).toEqual([]);
  });
});
