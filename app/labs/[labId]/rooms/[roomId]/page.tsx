import { LiveStudentRoom } from "@/components/student/live-room";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ labId: string; roomId: string }>;
}) {
  const { labId, roomId } = await params;
  return <LiveStudentRoom labId={labId} roomId={roomId} />;
}
