import { AppShell } from "@/components/layout/app-shell";
import { LiveMentorDashboard } from "@/components/mentor/live-dashboard";

export default async function MentorLabPage({
  params,
}: {
  params: Promise<{ labId: string }>;
}) {
  const { labId } = await params;
  return (
    <AppShell title="Moderator room" variant="live">
      <LiveMentorDashboard labId={labId} />
    </AppShell>
  );
}
