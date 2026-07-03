import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryEmojis = {
  cabelo: "💇", unha: "💅", estetica: "✨", sobrancelha: "🪒", maquiagem: "💄", outros: "🌟"
};

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
        "w-full text-left p-4 rounded-2xl border-2 transition-all",
        selected ? "border-primary bg-primary/5 shadow-md" : "border-border/50 bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{categoryEmojis[service.category] || "🌟"}</span>
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
            <p className="text-xs line-through text-muted-foreground">R$ {service.price}</p>
          )}
          <p className="font-heading font-bold text-lg">{`R$ ${finalPrice.toFixed(0)}`}</p>
          {hasPromo && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
              <Sparkles className="w-3 h-3" /> Promo
            </span>
          )}
        </div>
      </div>
    </button>
  );
}