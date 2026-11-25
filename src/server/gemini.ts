import { APP } from "@/config/brand";

export async function geminiText(prompt: string, json = false): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return body.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

export function chatSystem(actorName: string): string {
  return [
    `You help staff of ${APP.org} inside ${APP.name}.`,
    "Use only the JSON facts you are given. Do not invent guests, money, or names.",
    "Never tell a PR to approve, settle, or change someone's role.",
    `The person asking is ${actorName}.`,
    "Answer in plain sentences.",
  ].join(" ");
}
