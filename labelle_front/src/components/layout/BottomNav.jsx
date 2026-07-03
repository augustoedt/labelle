import { Link, useLocation } from "@tanstack/react-router";
import { Home, CalendarDays, Users, Wallet, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Início" },
  { path: "/agenda", icon: CalendarDays, label: "Agenda" },
  { path: "/clientes", icon: Users, label: "Clientes" },
  { path: "/financeiro", icon: Wallet, label: "Financeiro" },
  { path: "/mais", icon: MoreHorizontal, label: "Mais" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
