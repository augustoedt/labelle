import { useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Home, CalendarPlus, History, Gift, BookOpen, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import LaBelleLogo from "@/components/ui/LaBelleLogo";
import ClientHome from "@/components/client-app/ClientHome";
import ClientBooking from "@/components/client-app/ClientBooking";
import ClientHistory from "@/components/client-app/ClientHistory";
import ClientLoyalty from "@/components/client-app/ClientLoyalty";
import ClientCatalog from "@/components/client-app/ClientCatalog";
import InstallPwaButton from "@/components/client-app/InstallPwaButton";
import ShareAppButton from "@/components/client-app/ShareAppButton";
import { getClientSession, saveClientSession, clearClientSession } from "@/lib/clientAuth";

const tabs = [
  { id: "home", label: "Início", icon: Home },
  { id: "catalogo", label: "Catálogo", icon: BookOpen },
  { id: "agendar", label: "Agendar", icon: CalendarPlus },
  { id: "historico", label: "Histórico", icon: History },
  { id: "fidelidade", label: "Fidelidade", icon: Gift },
];

export default function ClientApp() {
  const [activeTab, setActiveTab] = useState("home");
  const [client, setClient] = useState(() => getClientSession());
  const prefersReduced = useReducedMotion();

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const updateClient = useCallback((updates) => {
    const updated = { ...client, ...updates };
    setClient(updated);
    saveClientSession(updated);
  }, [client]);

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-lg mx-auto relative">
      <InstallPwaButton />
      {/* Header */}
      <div className="sticky top-0 z-40 px-5 pt-7 pb-3 flex items-center justify-between border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <LaBelleLogo size="lg" />
        <div className="flex flex-col items-end gap-1">
          {client?.name && (
            <>
              <p className="text-xs text-muted-foreground font-medium">
                Olá, {client.name.split(" ")[0]}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground gap-1 px-2"
                onClick={() => { clearClientSession(); setClient(null); setActiveTab("home"); }}
              >
                <LogOut className="w-3 h-3" /> Sair
              </Button>
            </>
          )}
          <ShareAppButton />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced === true ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
            {activeTab === "home" && (
              <ClientHome
                clientPhone={client?.phone || ""}
                clientName={client?.name || ""}
                onNavigate={handleTabClick}
              />
            )}
            {activeTab === "catalogo" && (
              <ClientCatalog onNavigate={handleTabClick} />
            )}
            {activeTab === "agendar" && (
              <ClientBooking
                clientName={client?.name || ""}
                clientPhone={client?.phone || ""}
                onSaveClient={(name, phone) => updateClient({ name, phone })}
                onSuccess={() => setActiveTab("historico")}
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
        </motion.div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-card/90 backdrop-blur-xl border-t border-border/60 shadow-[0_-8px_24px_-22px_hsl(var(--foreground)/0.45)] flex z-50 safe-area-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 mx-0.5 my-1.5 rounded-2xl py-2 transition-all duration-200 relative active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.25]")} />
              <span className="text-xs font-medium">{tab.label}</span>
              {isActive && <div className="absolute top-0 inset-x-1/4 h-0.5 rounded-full bg-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
