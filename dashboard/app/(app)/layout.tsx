import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <Sidebar />
      <main className="relative min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
