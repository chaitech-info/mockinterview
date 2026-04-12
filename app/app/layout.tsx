import { AppFlowShell } from "@/components/AppFlowShell";
import { AppSubNav } from "@/components/AppSubNav";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFlowShell>
      <AppSubNav />
      {children}
    </AppFlowShell>
  );
}
