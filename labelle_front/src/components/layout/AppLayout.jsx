import { useState } from "react";
import { Outlet, Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  CalendarDays,
  Users,
  Scissors,
  Package,
  UsersRound,
  Wallet,
  BarChart3,
  Tag,
  Settings,
  Gift,
  BellRing,
  LogOut,
  Search,
} from "lucide-react";
import RoleNav from "./RoleNav";
import LaBelleLogo from "@/components/ui/LaBelleLogo";
import { useUser } from "@/lib/auth";

const adminLinks = [
  { path: "/", label: "Início", icon: Home },
  { path: "/agenda", label: "Agenda", icon: CalendarDays },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/servicos", label: "Serviços", icon: Scissors },
  { path: "/produtos", label: "Produtos", icon: Package },
  { path: "/profissionais", label: "Profissionais", icon: UsersRound },
  { path: "/financeiro", label: "Financeiro", icon: Wallet },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { path: "/promocoes", label: "Promoções", icon: Tag },
  { path: "/fidelidade", label: "Fidelidade", icon: Gift },
  { path: "/lembretes", label: "Lembretes", icon: BellRing },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
];
const professionalLinks = [
  { path: "/minha-agenda", label: "Minha agenda", icon: CalendarDays },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/servicos", label: "Serviços", icon: Scissors },
  { path: "/minhas-comissoes", label: "Comissões", icon: Wallet },
  { path: "/promocoes", label: "Promoções", icon: Tag },
];
export default function AppLayout({ children }) {
  const user = useUser();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const links = user?.role === "profissional" ? professionalLinks : adminLinks;
  const results = search
    ? links.filter((item) =>
        item.label
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(
            search
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase(),
          ),
      )
    : [];
  return (
    <div className="staff-shell">
      <aside className="staff-sidebar" aria-label="Gestão do salão">
        <LaBelleLogo size="sm" />
        <nav className="staff-sidebar-nav">
          {links.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={location.pathname === path ? "active" : ""}
              aria-current={location.pathname === path ? "page" : undefined}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="staff-sidebar-user">
          <strong>{user?.role === "admin" ? "Admin" : "Profissional"}</strong>
          <small>{user?.email}</small>
          <Link to="/logout">
            <LogOut size={14} />
            Sair
          </Link>
        </div>
      </aside>
      <main className="staff-main">
        <header className="staff-topbar">
          <div className="staff-search">
            <Search size={16} />
            <input
              aria-label="Buscar páginas da gestão"
              placeholder="Buscar páginas da gestão..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearch("");
              }}
            />
            {search && (
              <div className="staff-search-results">
                {results.length ? (
                  results.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSearch("")}
                    >
                      {item.label}
                    </Link>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhuma página encontrada.
                  </p>
                )}
              </div>
            )}
          </div>
          <span
            className="staff-topbar-profile"
            aria-label={
              user?.role === "admin" ? "Administrador" : "Profissional"
            }
          >
            {user?.role === "admin" ? "A" : "P"}
          </span>
        </header>
        <div className="staff-content">{children ?? <Outlet />}</div>
      </main>
      <RoleNav />
    </div>
  );
}
