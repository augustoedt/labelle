import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClientLoyalty } from "@/server/api";
import { Gift, Star, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { tierEmojis, tierLabels, tierSolidColors } from "@/lib/loyaltyTiers";
import { formatBRL } from "@/lib/format";
import { maskPhone, isValidPhone } from "@/lib/phone";

// Limites de pontos por tier (atenção: divergem do admin — ver src/lib/loyaltyTiers.js)
const tiers = {
  bronze: { label: tierLabels.bronze, emoji: tierEmojis.bronze, min: 0, max: 500, color: tierSolidColors.bronze },
  prata: { label: tierLabels.prata, emoji: tierEmojis.prata, min: 500, max: 1000, color: tierSolidColors.prata },
  ouro: { label: tierLabels.ouro, emoji: tierEmojis.ouro, min: 1000, max: 2000, color: tierSolidColors.ouro },
  vip: { label: tierLabels.vip, emoji: tierEmojis.vip, min: 2000, max: 2000, color: tierSolidColors.vip },
};

const benefits = {
  bronze: ["5% desconto na 5ª visita", "Acesso a promoções exclusivas"],
  prata: ["10% desconto em serviços", "Brinde no aniversário", "Agendamento prioritário"],
  ouro: ["15% desconto em tudo", "1 serviço gratuito por trimestre", "VIP na fila de espera"],
  vip: ["20% desconto sempre", "Serviço gratuito mensal", "Atendimento exclusivo", "Acesso antecipado a promoções"],
};

export default function ClientLoyalty({ clientPhone, onSetPhone }) {
  const [phoneInput, setPhoneInput] = useState(clientPhone || "");
  const [searched, setSearched] = useState(!!clientPhone);

  const { data: loyaltyData, isLoading } = useQuery({
    queryKey: ["client-loyalty", clientPhone],
    queryFn: () => getClientLoyalty({ data: { phone: clientPhone } }),
    enabled: !!clientPhone && searched,
  });

  const handleSearch = () => {
    if (isValidPhone(phoneInput)) {
      onSetPhone("", phoneInput);
      setSearched(true);
    }
  };

  if (!clientPhone || !searched) {
    return (
      <div className="px-5 py-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
          <Gift className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-heading font-semibold tracking-tight text-lg">Programa de Fidelidade</h2>
          <p className="text-sm text-muted-foreground mt-1">Informe seu WhatsApp para ver seus pontos</p>
        </div>
        <div className="text-left space-y-2">
          <Label className="text-xs">WhatsApp</Label>
          <Input value={phoneInput} onChange={e => setPhoneInput(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="rounded-xl" />
        </div>
        <Button className="w-full rounded-xl h-11 font-semibold" onClick={handleSearch} disabled={!isValidPhone(phoneInput)}>
          Ver meus pontos
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-5 py-5 space-y-5">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const client = loyaltyData?.client;

  if (!client) {
    return (
      <div className="px-5 py-10 text-center space-y-3">
        <p className="text-muted-foreground text-sm">Você ainda não está cadastrada no nosso programa.</p>
        <p className="text-xs text-muted-foreground">Agende um serviço e ganhe pontos automaticamente!</p>
      </div>
    );
  }

  const tier = tiers[client.loyalty_tier || "bronze"];
  const points = client.loyalty_points || 0;
  const visits = client.visit_count || 0;
  const spent = client.total_spent || 0;
  const nextTierKey = Object.keys(tiers).find(k => tiers[k].min > points);
  const nextTier = nextTierKey ? tiers[nextTierKey] : null;
  const progress = nextTier ? Math.min((points / nextTier.min) * 100, 100) : 100;

  return (
    <div className="px-5 py-5 space-y-5">
      {/* Tier card */}
      <div className="bg-foreground text-background rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{tier.emoji}</span>
          <div>
            <p className="text-xs opacity-60">Seu nível</p>
            <p className="text-xl font-heading font-bold tracking-tight">{tier.label}</p>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-heading font-bold tracking-tight">{points}</p>
            <p className="text-xs opacity-60">pontos acumulados</p>
          </div>
          <p className="text-sm opacity-70">{client.name?.split(" ")[0]}</p>
        </div>

        {nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-xs opacity-70 mb-1">
              <span>{points} pts</span>
              <span>{nextTier.min} pts para {nextTier.label}</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[["Visitas", visits, "🗓️"], ["Total gasto", formatBRL(spent), "💰"], ["Pontos", points, "⭐"]].map(([label, val, icon]) => (
          <div key={label} className="bg-card border border-border/50 rounded-2xl p-3 text-center">
            <p className="text-lg mb-1">{icon}</p>
            <p className="font-heading font-bold tracking-tight text-sm">{val}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4" /> Seus benefícios</h2>
        <div className="space-y-2">
          {(benefits[client.loyalty_tier || "bronze"] || []).map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3">
              <Star className="w-4 h-4 text-foreground shrink-0" />
              <p className="text-sm">{b}</p>
            </div>
          ))}
        </div>
      </div>

      {/* All tiers */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Níveis do programa</h2>
        <div className="space-y-2">
          {Object.entries(tiers).map(([key, t]) => (
            <div key={key} className={cn("flex items-center gap-3 rounded-xl p-3 border-2 transition-all",
              client.loyalty_tier === key ? "border-foreground bg-foreground/5" : "border-border/30 bg-card")}>
              <span className="text-xl">{t.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{t.label}</p>
                <p className="text-xs text-muted-foreground">{key === "vip" ? "2000+ pontos" : `${t.min} – ${t.max} pontos`}</p>
              </div>
              {client.loyalty_tier === key && <span className="text-xs font-bold bg-foreground text-background px-2 py-0.5 rounded-full">Atual</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
