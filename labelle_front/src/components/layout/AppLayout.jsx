import { Outlet } from "@tanstack/react-router";
import RoleNav from "./RoleNav";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-dvh bg-background">
      <main className="pb-20 max-w-lg mx-auto">
        {children ?? <Outlet />}
      </main>
      <RoleNav />
    </div>
  );
}
