import { ChatPanel } from "@/components/forms";
import { loadPage } from "@/server/page";

export const metadata = { title: "Chat" };

export default async function ChatPage() {
  const { event } = await loadPage();
  return (
    <div className="grid gap-4">
      <h1 className="display text-4xl">Chat</h1>
      <p className="max-w-xl text-sm text-muted">Paste a guest list. You get a preview, then it lands in Pending. Questions stay inside your own numbers.</p>
      <ChatPanel eventId={event?.id ?? null} />
    </div>
  );
}
