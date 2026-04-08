import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { NavigationProgress } from "@/components/ui/NavigationProgress";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <NavigationProgress />
      <Sidebar />
      <TopBar />
      <main className="ml-0 lg:ml-64 pt-24 px-4 lg:px-8 pb-12">{children}</main>
    </div>
  );
}
