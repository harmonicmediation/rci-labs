import { LiveStudentLobby } from "@/components/student/live-lobby";

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ labId: string }>;
}) {
  const { labId } = await params;
  return <LiveStudentLobby labId={labId} />;
}
