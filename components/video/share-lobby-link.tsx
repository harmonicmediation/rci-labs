"use client";

import { useEffect, useState } from "react";

export function ShareLobbyLink({
  labId,
  roomSize,
}: {
  labId: string;
  roomSize: number;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/labs/${labId}/lobby`);
  }, [labId]);

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-b border-line bg-card px-6 py-3">
      <p className="text-sm">
        Share this link. After sign-in, people join the lobby and a room starts
        when {roomSize} are waiting.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          readOnly
          value={url}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-lg bg-ink px-3 py-2 text-sm text-white"
          onClick={() => void copy()}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
