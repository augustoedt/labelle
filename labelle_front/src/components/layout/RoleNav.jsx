import { Link, useLocation } from "@tanstack/react-router";
import { Home, CalendarDays, Users, Wallet, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/auth";

// Um shell para todos os papéis: a navegação muda conforme a permissão.
// Admin gerencia o salão; profissional opera o dia a dia (agenda própria,
// clientes em leitura, comissões e um "Mais" filtrado).
const NAV = {
  admin: [
    { path: "/", label: "Início", icon: Home, exact: true },
    { path: "/agenda", label: "Agenda", icon: CalendarDays },
    { path: "/clientes", label: "Clientes", icon: Users },
    { path: "/financeiro", label: "Financeiro", icon: Wallet },
    { path: "/mais", label: "Mais", icon: MoreHorizontal },
  ],
  profissional: [
    { path: "/minha-agenda", label: "Início", icon: Home, exact: true },
    { path: "/clientes", label: "Clientes", icon: Users },
    { path: "/minhas-comissoes", label: "Comissões", icon: Wallet },
    { path: "/mais", label: "Mais", icon: MoreHorizontal },
  ],
};

export default function RoleNav() {
  const location = useLocation();
  const user = useUser();
  const items = NAV[user?.role] || NAV.admin;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map(({ path, label, icon: Icon, exact }) => {
          const isActive = exact
            ? location.pathname === path
            : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span className="text-xs font-medium">{label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
