import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import banned from "./eslint/no-banned-classes.mjs";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { rvt: { rules: { "no-banned-classes": banned } } },
    rules: { "rvt/no-banned-classes": "error" },
  },
  {
    ignores: [".next/**", ".open-next/**", "node_modules/**", "public/**", "coverage/**", "next-env.d.ts"],
  },
];

export default config;
