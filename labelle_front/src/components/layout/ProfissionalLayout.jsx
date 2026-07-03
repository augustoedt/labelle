import { Outlet, Link, useLocation } from "@tanstack/react-router";
import { CalendarDays, Wallet, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/minha-agenda", icon: CalendarDays, label: "Agenda" },
  { path: "/minhas-comissoes", icon: Wallet, label: "Comissões" },
];

export default function ProfissionalLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 max-w-lg mx-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-medium">{label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
              </Link>
            );
          })}
          <Link
            to="/logout"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium">Sair</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
