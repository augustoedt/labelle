import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientsApi } from "@/server/api";
import { Plus, Search, Crown, MessageCircle, Smartphone, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import ClientForm from "@/components/clients/ClientForm";

import { tierColors } from "@/lib/loyaltyTiers";
import { formatBRL } from "@/lib/format";

const sourceLabel = {
  app_cliente: { label: "App", icon: Smartphone, className: "text-primary" },
  gestao: { label: "Gestão", icon: Settings, className: "text-muted-foreground" },
  importacao: { label: "Importação", icon: Settings, className: "text-muted-foreground" },
  atendimento: { label: "Atendimento", icon: Settings, className: "text-muted-foreground" },
};

export default function Clients() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    // note: no "created_date" field on our Client resource yet (no timestamps),
    // so we can't sort newest-first like the old app did — follow-up: add
    // inserted_at/updated_at to the Studio resources.
    queryFn: () => ClientsApi.list({ limit: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => ClientsApi.create({ data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ClientsApi.update({ id, attributes: data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setShowForm(false); setEditing(null); },
  });

  const handleSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} cadastradas`}
        action={
          <Button size="sm" className="rounded-xl gap-1.5" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Nova
          </Button>
        }
      />

      {/* Search */}
      <div className="px-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-10 rounded-xl bg-card"
          />
        </div>
      </div>

      {/* Client list */}
      <div className="px-5 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        ) : (
          <>
        {filtered.map((client) => (
          <div
            key={client.id}
            role="button"
            tabIndex={0}
            className="bg-card rounded-2xl border border-border/50 p-4 cursor-pointer transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => { setEditing(client); setShowForm(true); }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-heading font-bold text-primary">
                    {client.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{client.name}</p>
                    {client.loyalty_tier && client.loyalty_tier !== "bronze" && (
                      <Badge className={cn("text-xs border-0 py-0", tierColors[client.loyalty_tier])}>
                        <Crown className="w-2.5 h-2.5 mr-0.5" />
                        {client.loyalty_tier.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{client.phone}</p>
                </div>
              </div>
              <a
                href={`https://wa.me/55${client.phone?.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
              </a>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
              <span>{client.visit_count || 0} visitas</span>
              <span className="tabular-nums">{formatBRL(client.total_spent)} gastos</span>
              {client.source && sourceLabel[client.source] && (() => {
                const src = sourceLabel[client.source];
                const Icon = src.icon;
                return (
                  <span className={`flex items-center gap-0.5 ${src.className}`}>
                    <Icon className="w-3 h-3" />{src.label}
                  </span>
                );
              })()}
              {client.last_appointment_date && (
                <span>Último: {new Date(client.last_appointment_date + "T12:00").toLocaleDateString("pt-BR")}</span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum cliente encontrado</p>
        )}
          </>
        )}
      </div>

      <ClientForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={handleSubmit}
        client={editing}
      />
    </div>
  );
}
