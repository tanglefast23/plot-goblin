import { RoomsDashboardClient } from "@/components/RoomsDashboardClient";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export default function RoomsPage() {
  return (
    <WorkspaceShell>
      <RoomsDashboardClient />
    </WorkspaceShell>
  );
}
