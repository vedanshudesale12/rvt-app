/**
 * Product name. This object is the only place the app name is defined.
 * Titles, the PWA manifest, emails, and the interface import `APP` from here.
 * README.md repeats the same words and tests/brand.test.ts keeps them in sync.
 */
export const APP = {
  name: "Backstage RVT",
  shortName: "Backstage",
  org: "Riot Vibe Theory",
  description: "Guest lists, the door, and who owes what.",
  locale: "en-IN",
  timeZone: "Asia/Kolkata",
  idleMinutes: 30,
  sessionHours: 12,
  maxUploadBytes: 5 * 1024 * 1024,
} as const;
