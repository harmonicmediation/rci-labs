import { AdminPanels } from "@/components/admin/admin-panels";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminPage() {
  return (
    <AppShell title="Admin">
      <AdminPanels />
    </AppShell>
  );
}
