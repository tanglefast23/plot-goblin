import { GuidedSetupClient } from "@/components/GuidedSetupClient";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export default function GuidedSetupPage() {
  return (
    <WorkspaceShell>
      <GuidedSetupClient />
    </WorkspaceShell>
  );
}
