"use client";

import { useAction } from "convex/react";
import { useEffect, useRef, useState } from "react";
import type { DailyCall as DailyCallClient } from "@daily-co/daily-js";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function DailyCall({
  roomId,
  className,
}: {
  roomId: string;
  className?: string;
}) {
  const issueJoinToken = useAction(api.videoActions.issueJoinToken);
  const frameRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCallClient | null>(null);
  const [status, setStatus] = useState<"connecting" | "joined" | "error">(
    "connecting",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function join() {
      setStatus("connecting");
      setError(null);
      try {
        const creds = await issueJoinToken({
          roomId: roomId as Id<"practiceRooms">,
        });
        if (cancelled) return;
        if (creds.provider !== "daily") {
          throw new Error("Live video is not configured yet.");
        }

        const Daily = (await import("@daily-co/daily-js")).default;
        const existing = Daily.getCallInstance();
        if (existing) {
          await existing.destroy();
        }
        if (cancelled || !frameRef.current) return;

        const call = Daily.createFrame(frameRef.current, {
          showLeaveButton: false,
          showFullscreenButton: true,
          iframeStyle: {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            border: "0",
          },
        });
        callRef.current = call;
        await call.join({ url: creds.roomUrl, token: creds.token });
        if (!cancelled) setStatus("joined");
      } catch (caught) {
        if (cancelled) return;
        setStatus("error");
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not connect video. Please try again.",
        );
      }
    }

    void join();

    return () => {
      cancelled = true;
      const call = callRef.current;
      callRef.current = null;
      if (call) {
        void call.destroy();
      }
    };
  }, [issueJoinToken, roomId]);

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className ?? ""}`}>
      <div ref={frameRef} className="absolute inset-0" />
      {status !== "joined" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 p-4 text-center text-sm text-white">
          {error ?? "Connecting video…"}
        </div>
      ) : null}
    </div>
  );
}
