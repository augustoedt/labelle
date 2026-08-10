import { Clock, Sparkles } from "lucide-react";
import ServiceCategoryIcon from "@/components/ui/ServiceCategoryIcon";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";

export default function ServiceCard({ service, selected, onSelect, promotion }) {
  const hasPromo = !!promotion;
  const finalPrice = hasPromo
    ? promotion.discount_type === "percent"
      ? service.price * (1 - promotion.discount_value / 100)
      : service.price - promotion.discount_value
    : service.price;

  return (
    <button
      onClick={() => onSelect(service)}
      className={cn(
        "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary bg-primary/5 shadow-[0_12px_28px_-18px_hsl(var(--primary)/0.7)]" : "border-border/60 bg-card/90 hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/70 text-foreground">
          <ServiceCategoryIcon category={service.category} className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-sm">{service.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" /> {service.duration_minutes}min
          </div>
          {service.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
          )}
        </div>
        <div className="text-right">
          {hasPromo && (
            <p className="text-xs line-through text-muted-foreground tabular-nums">{formatBRL(service.price)}</p>
          )}
          <p className="font-heading font-bold tracking-tight text-lg tabular-nums">{formatBRL(finalPrice)}</p>
          {hasPromo && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
              <Sparkles className="w-3 h-3" /> Promo
            </span>
          )}
        </div>
      </div>
    </button>
  );
}