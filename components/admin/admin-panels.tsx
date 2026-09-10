"use client";

import { useState } from "react";

const members = [
  ["Alex Rivera", "alex@rci.local", "student", "active", "rci_student_labs"],
  ["Taylor Morgan", "taylor@rci.local", "student", "active", "rci_student_labs"],
  ["Celicia Chen", "mentor.one@rci.local", "mentor", "active", "mentor_access"],
  ["RCI Admin", "admin@rci.local", "admin", "active", "admin_access"],
];

export function AdminPanels() {
  const [tab, setTab] = useState<"members" | "mentors" | "rubrics" | "labs">("members");

  return (
    <div className="p-6">
      <div className="mb-5 flex gap-2">
        {(["members", "mentors", "rubrics", "labs"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize ${
              tab === item ? "bg-ink text-white" : "border border-line bg-card"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "members" || tab === "mentors" ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Entitlement</th>
              </tr>
            </thead>
            <tbody>
              {members
                .filter((row) => (tab === "mentors" ? row[2] === "mentor" : true))
                .map((row) => (
                  <tr key={row[1]} className="border-t border-line">
                    {row.map((cell) => (
                      <td key={cell} className="px-4 py-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "rubrics" ? (
        <div className="rounded-2xl border border-line bg-card p-5 shadow-[var(--shadow)]">
          <p className="font-semibold">V1 Practice Lab Rubric · v1</p>
          <p className="mt-1 text-sm text-muted">Readiness threshold 3.5</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>avoid_advice · weight 2</li>
            <li>empathy_reflection · weight 2</li>
            <li>open_questions · weight 1</li>
            <li>presence_silence · weight 1</li>
            <li>safety · weight 2</li>
          </ul>
        </div>
      ) : null}

      {tab === "labs" ? (
        <div className="rounded-2xl border border-line bg-card p-5 shadow-[var(--shadow)]">
          <p className="font-semibold">Create lab</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Title
              <input className="mt-1 w-full rounded-lg border border-line px-3 py-2" defaultValue="Wednesday Practice Lab" />
            </label>
            <label className="text-sm">
              Room size
              <input className="mt-1 w-full rounded-lg border border-line px-3 py-2" defaultValue="3" />
            </label>
            <label className="text-sm">
              Round length (seconds)
              <input className="mt-1 w-full rounded-lg border border-line px-3 py-2" defaultValue="900" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked /> Transcription enabled
            </label>
          </div>
          <button className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm text-white">
            Save draft
          </button>
        </div>
      ) : null}
    </div>
  );
}
