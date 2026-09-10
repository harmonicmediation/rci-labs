import { MentorLabHome } from "@/components/mentor/lab-home";
import { AppShell } from "@/components/layout/app-shell";

export default function MentorHomePage() {
  return (
    <AppShell title="Live labs" variant="live">
      <MentorLabHome />
    </AppShell>
  );
}
