import { useQuery } from "@tanstack/react-query";
import { ClientsApi } from "@/server/api";
import { ArrowLeft, Crown, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import { tierColors, tierLabels } from "@/lib/loyaltyTiers";

// Limites de pontos por tier (atenção: divergem do app da cliente — ver src/lib/loyaltyTiers.js)
const tierConfig = {
  bronze: { label: tierLabels.bronze, color: tierColors.bronze, min: 0 },
  prata: { label: tierLabels.prata, color: tierColors.prata, min: 100 },
  ouro: { label: tierLabels.ouro, color: tierColors.ouro, min: 300 },
  vip: { label: tierLabels.vip, color: tierColors.vip, min: 600 },
};

export default function Loyalty() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => ClientsApi.list({ sort: "-loyalty_points", limit: 200 }),
  });

  const clientsByTier = {
    vip: clients.filter(c => (c.loyalty_points || 0) >= 600),
    ouro: clients.filter(c => (c.loyalty_points || 0) >= 300 && (c.loyalty_points || 0) < 600),
    prata: clients.filter(c => (c.loyalty_points || 0) >= 100 && (c.loyalty_points || 0) < 300),
    bronze: clients.filter(c => (c.loyalty_points || 0) < 100),
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fidelidade"
        subtitle="Programa de pontos"
        action={
          <Link to="/mais"><Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
        }
      />

      {/* Tier overview */}
      <div className="px-5 grid grid-cols-4 gap-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : (
        Object.entries(tierConfig).map(([key, config]) => (
          <div key={key} className="bg-card rounded-xl border border-border/50 p-3 text-center">
            <Crown className="w-5 h-5 mx-auto text-accent mb-1" />
            <p className="text-xs font-medium">{config.label}</p>
            <p className="text-lg font-heading font-bold">{clientsByTier[key]?.length || 0}</p>
          </div>
        ))
        )}
      </div>

      {/* Clients by tier */}
      {isLoading ? (
        <div className="px-5 space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
      Object.entries(clientsByTier).filter(([, cs]) => cs.length > 0).map(([tier, cs]) => (
        <div key={tier} className="px-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <Star className="w-3 h-3" /> {tierConfig[tier].label}
          </h3>
          <div className="space-y-2">
            {cs.slice(0, 10).map((client) => (
              <div key={client.id} className="bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-heading font-bold text-primary">{client.name?.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.visit_count || 0} visitas</p>
                </div>
                <div className="text-right">
                  <Badge className={cn("text-xs border-0", tierConfig[tier].color)}>
                    {client.loyalty_points || 0} pts
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))
      )}

      {!isLoading && clients.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12 px-5">Nenhum cliente no programa de fidelidade</p>
      )}
    </div>
  );
}
