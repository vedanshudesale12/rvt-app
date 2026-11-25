import { APP } from "@/config/brand";

export function GET() {
  return Response.json({ ok: true, name: APP.name });
}
