import { AppShell } from "@/components/layout/app-shell";
import { MentorDashboard } from "@/components/mentor/dashboard";
import { fixtureChat, fixtureMentors, fixtureRooms } from "@/lib/fixtures/dashboard";

export default function MentorPreviewPage() {
  return (
    <AppShell title="Moderator room">
      <MentorDashboard
        preview
        mentors={fixtureMentors}
        rooms={fixtureRooms}
        chat={fixtureChat}
      />
    </AppShell>
  );
}
