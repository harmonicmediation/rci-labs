"use client";

import { useState } from "react";

export function StudentLobbyView({
  labTitle = "Wednesday Practice Lab",
}: {
  labTitle?: string;
}) {
  const [consented, setConsented] = useState(false);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-6 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        Lobby
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{labTitle}</h1>
      {!consented ? (
        <form
          className="mt-6 space-y-3 rounded-2xl border border-line bg-card p-5 shadow-[var(--shadow)]"
          onSubmit={(event) => {
            event.preventDefault();
            setConsented(true);
          }}
        >
          <p className="text-sm font-medium">Session notice (policy v1)</p>
          <p className="text-sm leading-6 text-muted">
            This lab may use live audio/video, transcription, AI monitoring for
            mentor support, and mentor reports. Recording is off unless the lab
            is configured to record. Decline uses the lab policy (default: no
            entry).
          </p>
          {[
            "Live audio and video",
            "Transcription if enabled for this lab",
            "AI monitoring for mentor support",
            "Mentor review and reports",
            "Retention of transcript/report per RCI policy",
          ].map((label) => (
            <label key={label} className="flex items-start gap-2 text-sm">
              <input type="checkbox" required className="mt-1" />
              {label}
            </label>
          ))}
          <button className="rounded-lg bg-ink px-4 py-2 text-sm text-white" type="submit">
            Agree and join lobby
          </button>
        </form>
      ) : (
        <>
          <p className="mt-3 text-muted">
            You are in the queue. We will place you in a practice room of 3 as soon
            as a group is ready. A mentor can also assign you manually.
          </p>
          <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-[var(--shadow)]">
            <p className="text-sm font-medium">Matching status</p>
            <p className="mt-1 text-sm text-muted">Waiting for 1 more participant</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
              <div className="h-full w-2/3 bg-accent" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function StudentRoomView() {
  const [helpSent, setHelpSent] = useState(false);

  return (
    <div className="flex min-h-[80vh] flex-col">
      <div className="flex items-center justify-between border-b border-line bg-card px-6 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Room 2 · Empathic Reflection</p>
          <p className="font-semibold">Your role: Coach</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold">12:34</span>
          <button
            className="rounded-lg bg-ink px-3 py-1.5 text-sm text-white"
            onClick={() => setHelpSent(true)}
          >
            {helpSent ? "Mentor requested" : "Request mentor"}
          </button>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 p-4 md:grid-cols-3">
        {["You · Coach", "Taylor · Client", "Noel · Observer"].map((label) => (
          <div key={label} className="flex items-end rounded-2xl bg-slate-900 p-4">
            <p className="text-sm text-white">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-line bg-card px-6 py-3">
        <button className="rounded-lg border border-line px-3 py-2 text-sm">Mute</button>
        <button className="rounded-lg border border-line px-3 py-2 text-sm">Camera</button>
        <button className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
          Leave
        </button>
      </div>
    </div>
  );
}
