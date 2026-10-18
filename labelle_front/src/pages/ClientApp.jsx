import { useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  CalendarPlus,
  History,
  Gift,
  BookOpen,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LaBelleLogo from "@/components/ui/LaBelleLogo";
import ClientHome from "@/components/client-app/ClientHome";
import ClientBooking from "@/components/client-app/ClientBooking";
import ClientHistory from "@/components/client-app/ClientHistory";
import ClientLoyalty from "@/components/client-app/ClientLoyalty";
import ClientCatalog from "@/components/client-app/ClientCatalog";
import InstallPwaButton from "@/components/client-app/InstallPwaButton";
import {
  getClientSession,
  saveClientSession,
  clearClientSession,
} from "@/lib/clientAuth";

const tabs = [
  { id: "home", label: "Início", icon: Home },
  { id: "catalogo", label: "Catálogo", icon: BookOpen },
  { id: "agendar", label: "Agendar", icon: CalendarPlus },
  { id: "historico", label: "Agendamentos", icon: History },
  { id: "fidelidade", label: "Fidelidade", icon: Gift },
];
const sections = [
  { id: "inicio", label: "Início" },
  { id: "servicos", label: "Serviços" },
  { id: "profissionais", label: "Profissionais" },
  { id: "sobre", label: "Sobre" },
  { id: "contato", label: "Contato" },
];
export default function ClientApp() {
  const location = useLocation();
  const navigateRoute = useNavigate();
  const search = location.search;
  const activeTab = location.pathname.startsWith("/cliente/")
    ? ({ catalogo: "catalogo", agendar: "agendar", agendamentos: "historico", fidelidade: "fidelidade" }[location.pathname.split("/")[2]] || "home")
    : location.pathname === "/agendar" ? "agendar" : location.pathname === "/app" ? search.tab || "home" : "home";
  const category = activeTab === "catalogo" ? search.category || "all" : "all";
  const [client, setClient] = useState(() => getClientSession());
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (tab, { category: selectedCategory = "all", selection } = {}) => {
    const path = { home: "/cliente", catalogo: "/cliente/catalogo", agendar: "/cliente/agendar", historico: "/cliente/agendamentos", fidelidade: "/cliente/fidelidade" }[tab] || "/cliente";
    if (tab === "agendar") {
      navigateRoute({ to: path, search: selection ? { serviceId: selection.serviceId, variantId: selection.variantId || undefined, step: 2 } : {} });
    } else {
      navigateRoute({ to: path, search: tab === "catalogo" ? { category: selectedCategory, q: search.q || undefined } : {} });
    }
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const section = (id) => {
    if (activeTab === "home" && search.section === id) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigateRoute({ to: "/cliente", hash: id });
    }
    setMenuOpen(false);
  };
  useEffect(() => {
    if (activeTab === "home" && location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    }
  }, [activeTab, location.hash]);
  const updateClient = useCallback(
    (updates) => {
      const updated = { ...client, ...updates };
      setClient(updated);
      saveClientSession(updated);
    },
    [client],
  );
  return (
    <div className="client-website min-h-dvh">
      <InstallPwaButton />
      <header className="website-header">
        <div className="website-header-inner">
          <button
            className="logo-link"
            aria-label="La Belle Studio — início"
            onClick={() => section("inicio")}
          >
            <LaBelleLogo size="lg" />
          </button>
          <nav className="desktop-site-nav" aria-label="Navegação principal">
            {sections.map((item) => (
              <button
                key={item.id}
                className={
                  activeTab === "home" && item.id === "inicio" ? "active" : ""
                }
                onClick={() => section(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="header-account"
              onClick={() => navigate("historico")}
            >
              Meus agendamentos <ArrowUpRight size={14} />
            </button>
            <button
              className="brand-button header-book"
              onClick={() => navigate("agendar")}
            >
              Agendar agora <ArrowUpRight size={15} />
            </button>
            <button
              className="mobile-menu-button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              aria-controls="website-mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="website-mobile-menu"
            className="mobile-site-menu"
            aria-label="Menu do site"
          >
            {sections.map((item) => (
              <button key={item.id} onClick={() => section(item.id)}>
                {item.label}
              </button>
            ))}
            <button onClick={() => navigate("historico")}>
              Meus agendamentos
            </button>
            <a href="/login">Acesso da equipe</a>
          </nav>
        )}
      </header>
      <main id="conteudo-principal">
        {activeTab === "home" ? (
          <ClientHome
            clientName={client?.name || ""}
            onNavigate={navigate}
            onCategory={(cat) => navigate("catalogo", { category: cat })}
          />
        ) : (
          <div
            className={cn(
              "client-workspace",
              activeTab === "catalogo" ? "catalog-workspace" : "flow-workspace",
            )}
          >
            <div className="workspace-topline">
              <button className="text-action" onClick={() => navigate("home")}>
                <ArrowLeft size={16} /> Voltar ao início
              </button>
              {client?.name && (
                <div className="client-identity">
                  <span>Olá, {client.name.split(" ")[0]}</span>
                  <button
                    aria-label="Sair da identificação de cliente"
                    onClick={() => {
                      clearClientSession();
                      setClient(null);
                      navigate("home");
                    }}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              )}
            </div>
            <nav className="desktop-client-tabs" aria-label="Área da cliente">{tabs.filter(tab => tab.id !== "home").map(({id,label,icon:Icon}) => <button key={id} className={activeTab === id ? "active" : ""} aria-current={activeTab === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={15} />{label}</button>)}</nav>
          {activeTab === "catalogo" && (
              <ClientCatalog
                initialCategory={category}
                initialSearch={search.q || ""}
                initialServiceId={search.service}
                initialVariantId={search.variant}
                onDetailChange={(service, variant, push = false) =>
                  navigateRoute({
                    to: "/cliente/catalogo",
                    search: { ...search, service, variant },
                    replace: !push,
                  })
                }
                onSearchChange={(q) => navigateRoute({ to: "/cliente/catalogo", search: { ...search, q: q || undefined }, replace: true })}
                onCategoryChange={(selectedCategory) =>
                  navigateRoute({
                    to: "/cliente/catalogo",
                    search: { ...search, category: selectedCategory },
                  })
                }
                onNavigate={navigate}
                onBook={(selection) => navigate("agendar", { selection })}
              />
            )}
            {activeTab === "agendar" && (
              <ClientBooking
                initialBookingState={search}
                onBookingStateChange={(state, push = false) =>
                  navigateRoute({
                    to: "/cliente/agendar",
                    search: Object.fromEntries(Object.entries(state).filter(([, value]) => value !== undefined && value !== null && value !== "")),
                    replace: !push,
                  })
                }
                clientName={client?.name || ""}
                clientPhone={client?.phone || ""}
                onSaveClient={(name, phone) => updateClient({ name, phone })}
                onSuccess={() => navigateRoute({ to: "/cliente/agendamentos", replace: true })}
              />
            )}
            {activeTab === "historico" && (
              <ClientHistory
                clientPhone={client?.phone || ""}
                onSetPhone={(name, phone) => updateClient({ name, phone })}
              />
            )}
            {activeTab === "fidelidade" && (
              <ClientLoyalty
                clientPhone={client?.phone || ""}
                onSetPhone={(name, phone) => updateClient({ name, phone })}
              />
            )}
          </div>
        )}
      </main>
      <nav
        className="client-bottom-nav safe-area-bottom"
        aria-label="Área da cliente"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              navigate(id);
            }}
            className={cn(activeTab === id && "active")}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
