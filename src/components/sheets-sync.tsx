"use client";

import { useState } from "react";
import { api } from "@/components/use-api";

export function SheetsSync({ configured }: { configured: boolean }) {
  const [message, setMessage] = useState(configured ? "Google Sheets is connected." : "Google Sheets is not configured.");
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        className="border border-line bg-panel px-3 py-2"
        onClick={() => {
          api("/api/data", {})
            .then((data) => setMessage(`Synced ${String((data as { rows?: number }).rows ?? 0)} settle-up rows.`))
            .catch((error: Error) => setMessage(error.message));
        }}
      >
        Sync to Sheets
      </button>
      <span className="text-muted">{message}</span>
    </div>
  );
}
