import { useQuery } from "@tanstack/react-query";
import { getClientAppointments, ServicesApi, PromotionsApi } from "@/server/api";
import { CalendarPlus, Clock, Sparkles, ChevronRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/format";

export default function ClientHome({ clientPhone, clientName, onNavigate }) {
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["client-appointments", clientPhone],
    queryFn: () => getClientAppointments({ data: { phone: clientPhone } }).then(r => r.appointments || []),
    enabled: !!clientPhone
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => PromotionsApi.list()
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list()
  });

  const activePromotions = promotions.filter((p) => p.is_active);
  const upcoming = appointments.filter((a) => a.status !== "cancelado" && a.status !== "concluido");
  const next = upcoming[0];

  const getDateLabel = (dateStr) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Hoje";
    if (isTomorrow(d)) return "Amanhã";
    return format(d, "dd 'de' MMMM", { locale: ptBR });
  };

  const categoryEmojis = { cabelo: "💇", unha: "💅", estetica: "✨", sobrancelha: "🪒", maquiagem: "💄", outros: "🌟" };

  return (
    <div className="px-5 py-5 space-y-6">
      {/* Next appointment */}
      {isLoadingAppointments ?
      <Skeleton className="h-36 rounded-2xl" /> :

      next ?
      <div className="bg-foreground text-background rounded-2xl p-5">
          <p className="text-xs font-medium opacity-60 mb-1">Próximo agendamento</p>
          <p className="text-xl font-heading font-bold tracking-tight">{next.service_name}</p>
          <p className="text-sm opacity-80 mt-1">com {next.professional_name}</p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4 opacity-70" />
              <span>{next.time}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 opacity-70" />
              <span>{getDateLabel(next.date)}</span>
            </div>
          </div>
        </div> :

      <div className="bg-secondary/30 rounded-2xl p-5 text-center">
          <p className="text-sm text-muted-foreground mb-3">Nenhum agendamento próximo</p>
          <Button
          size="sm"
          className="rounded-xl font-semibold"
          onClick={() => onNavigate("agendar")}>

            <CalendarPlus className="w-4 h-4 mr-1" /> Agendar agora
          </Button>
        </div>
      }

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate("agendar")}
          className="bg-card border border-border/50 rounded-2xl p-4 text-left hover:border-foreground/20 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

          <CalendarPlus className="w-6 h-6 mb-2" />
          <p className="font-semibold text-sm">Agendar</p>
          <p className="text-xs text-muted-foreground">Marque seu horário</p>
        </button>
        <button
          onClick={() => onNavigate("fidelidade")}
          className="bg-card border border-border/50 rounded-2xl p-4 text-left hover:border-foreground/20 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

          <Sparkles className="w-6 h-6 mb-2" />
          <p className="font-semibold text-sm">Fidelidade</p>
          <p className="text-xs text-muted-foreground">Seus pontos e prêmios</p>
        </button>
      </div>

      {/* Active promotions */}
      {activePromotions.length > 0 &&
      <div>
          <h2 className="font-heading text-base font-semibold tracking-tight mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" /> Promoções ativas
          </h2>
          <div className="space-y-2">
            {activePromotions.map((promo) =>
          <div key={promo.id} className="bg-secondary/30 border border-secondary rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{promo.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{promo.description}</p>
                  </div>
                  <span className="bg-foreground text-background px-3 py-1 text-xs font-bold rounded-lg">
                    {promo.discount_type === "percent" ? `-${promo.discount_value}%` : `-${formatBRL(promo.discount_value)}`}
                  </span>
                </div>
              </div>
          )}
          </div>
        </div>
      }

      {/* Popular services */}
      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight mb-3">Serviços populares</h2>
        <div className="space-y-2">
          {isLoadingServices ?
          Array.from({ length: 4 }).map((_, i) =>
          <Skeleton key={i} className="h-16 rounded-2xl" />
          ) :

          services.filter((s) => s.is_active).slice(0, 4).map((svc) =>
          <button
            key={svc.id}
            onClick={() => onNavigate("agendar")}
            className="w-full flex items-center gap-3 bg-card border border-border/50 rounded-2xl p-3 hover:border-foreground/20 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

              <span className="text-xl">{categoryEmojis[svc.category] || "🌟"}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{svc.name}</p>
                <p className="text-xs text-muted-foreground">{svc.duration_minutes}min</p>
              </div>
              <p className="font-heading font-bold tracking-tight text-sm tabular-nums">{formatBRL(svc.price)}</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>);

}
