"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Show, UserButton } from "@clerk/nextjs";

const previewNav = [
  { href: "/preview/mentor", label: "Live labs" },
  { href: "/preview/admin", label: "Members" },
  { href: "/preview/admin", label: "Mentors" },
  { href: "/preview/admin", label: "Rubrics" },
  { href: "/preview/student", label: "Student room" },
];

const liveNav = [
  { href: "/mentor", label: "Live labs" },
  { href: "/labs", label: "Practice labs" },
  { href: "/admin", label: "Members" },
  { href: "/preview/student", label: "Student preview" },
];

export function AppShell({
  children,
  title = "RCI Labs",
  variant = "preview",
}: {
  children: ReactNode;
  title?: string;
  variant?: "preview" | "live";
}) {
  const nav = variant === "live" ? liveNav : previewNav;
  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="flex w-60 flex-col bg-sidebar text-white">
        <div className="px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Relationship Coaching Institute
          </p>
          <p className="mt-1 text-lg font-semibold">RCI Labs</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-slate-500">
          {variant === "live" ? "Version 1 live" : "Version 1 preview"}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-card px-6 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">RCI Live Labs</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          {variant === "live" ? (
            <Show when="signed-in">
              <UserButton />
            </Show>
          ) : (
            <p className="hidden text-sm text-muted md:block">
              Better conversation. Stronger coaching.
            </p>
          )}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
