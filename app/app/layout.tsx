import { AppSubNav } from "@/components/AppSubNav";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppSubNav />
      {children}
    </>
  );
}
