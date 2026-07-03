import { useState, useCallback } from "react";
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

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const updateClient = useCallback((updates) => {
    const updated = { ...client, ...updates };
    setClient(updated);
    saveClientSession(updated);
  }, [client]);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <InstallPwaButton />
      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex items-center justify-between bg-background">
        <LaBelleLogo size="lg" dark />
        <div className="flex flex-col items-end gap-1">
          {client?.name && (
            <>
              <p className="text-xs text-muted-foreground font-medium">
                Olá, {client.name.split(" ")[0]} ✨
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
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border/50 flex z-50">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div
                  className="absolute top-0 h-0.5 bg-foreground"
                  style={{ left: `${idx * 20}%`, width: "20%" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
