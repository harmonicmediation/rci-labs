"use client";

import { Show, SignInButton, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/convex/_generated/api";

export function LiveLabsList() {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.members.me, isAuthenticated ? {} : "skip");
  const labs = useQuery(api.labs.listOpen, me ? {} : "skip");
  const ensureSelf = useMutation(api.members.ensureSelf);

  useEffect(() => {
    if (!isAuthenticated || me) return;
    void ensureSelf({
      email: user?.primaryEmailAddress?.emailAddress,
      firstName: user?.firstName ?? user?.fullName?.split(" ")[0],
      lastName:
        user?.lastName ?? user?.fullName?.split(" ").slice(1).join(" ") ?? undefined,
    });
  }, [ensureSelf, isAuthenticated, me, user]);

  return (
    <AppShell title="Practice labs" variant="live">
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-muted">
          Join an open lab to practice coaching with others. Mentors are nearby
          if a room needs support.
        </p>
        <Show
          when="signed-in"
          fallback={
            <div className="mt-6 rounded-2xl border border-line bg-card p-5">
              <p className="text-sm">Sign in to see today’s labs.</p>
              <SignInButton mode="redirect">
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm text-white"
                >
                  Sign in
                </button>
              </SignInButton>
            </div>
          }
        >
          {isLoading || me === undefined || (me && labs === undefined) ? (
            <p className="mt-6 text-sm text-muted">One moment…</p>
          ) : (labs ?? []).length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              No labs are open right now. Check back when a mentor starts a
              session.
            </p>
          ) : (
            <ul className="mt-6 overflow-hidden rounded-2xl border border-line bg-card">
              {(labs ?? []).map((lab) => (
                <li key={lab._id} className="border-t border-line first:border-t-0">
                  <Link
                    className="flex items-center justify-between px-5 py-4 text-sm hover:bg-surface"
                    href={`/labs/${lab._id}/lobby`}
                  >
                    <span>
                      <span className="font-medium">{lab.title}</span>
                      <span className="ml-2 text-muted">
                        {lab.status === "live" ? "In session" : "Open"}
                      </span>
                    </span>
                    <span className="text-muted">Enter lobby</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Show>
      </div>
    </AppShell>
  );
}
