import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-surface">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-[#263046] focus:text-sm focus:font-medium">
        Skip to content
      </a>
      <NavigationProgress />
      <Sidebar />
      <TopBar />
      <main id="main-content" className="ml-0 lg:ml-64 pt-24 px-4 lg:px-8 pb-12"><ErrorBoundary>{children}</ErrorBoundary></main>
    </div>
  );
}
