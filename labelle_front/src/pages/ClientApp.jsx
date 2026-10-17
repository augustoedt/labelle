import { useState, useCallback, useEffect } from "react";
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
export default function ClientApp({ initialTab = "home" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [bookingSelection, setBookingSelection] = useState(null);
  const [category, setCategory] = useState("all");
  const [client, setClient] = useState(() => getClientSession());
  const [menuOpen, setMenuOpen] = useState(false);
  const [sectionTarget, setSectionTarget] = useState(null);
  const navigate = (tab) => {
    setActiveTab(tab);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const section = (id) => {
    setActiveTab("home");
    setSectionTarget(id);
    setMenuOpen(false);
  };
  useEffect(() => {
    if (activeTab === "home" && sectionTarget) {
      const target = document.getElementById(sectionTarget);
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      setSectionTarget(null);
    }
  }, [activeTab, sectionTarget]);
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
            onCategory={(cat) => {
              setCategory(cat);
              navigate("catalogo");
            }}
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
                onNavigate={navigate}
                onBook={(selection) => {
                  setBookingSelection(selection);
                  navigate("agendar");
                }}
              />
            )}
            {activeTab === "agendar" && (
              <ClientBooking
                initialSelection={bookingSelection}
                onClearSelection={() => setBookingSelection(null)}
                clientName={client?.name || ""}
                clientPhone={client?.phone || ""}
                onSaveClient={(name, phone) => updateClient({ name, phone })}
                onSuccess={() => navigate("historico")}
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
              if (id === "catalogo") setCategory("all");
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
