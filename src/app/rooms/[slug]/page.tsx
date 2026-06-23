import { RoomEditorClient } from "@/components/RoomEditorClient";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export default function RoomPage() {
  return (
    <WorkspaceShell>
      <RoomEditorClient />
    </WorkspaceShell>
  );
}
