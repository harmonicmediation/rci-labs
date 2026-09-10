import { AppShell } from "@/components/layout/app-shell";
import { StudentLobbyView, StudentRoomView } from "@/components/student/practice-views";

export default function StudentPreviewPage() {
  return (
    <AppShell title="Student experience">
      <div className="grid gap-6 p-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card">
          <StudentLobbyView />
        </div>
        <div className="rounded-2xl border border-line bg-card">
          <StudentRoomView />
        </div>
      </div>
    </AppShell>
  );
}
