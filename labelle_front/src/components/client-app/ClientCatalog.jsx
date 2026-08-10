import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ServicesApi, PromotionsApi } from "@/server/api";
import { CalendarPlus, Clock, LayoutGrid, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import ServiceCategoryIcon, { categoryLabels } from "@/components/ui/ServiceCategoryIcon";

// Unsplash photos per category (curated, beauty-related)
const categoryPhotos = {
  cabelo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80",
  unha: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80",
  estetica: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
  sobrancelha: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80",
  maquiagem: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
  outros: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
};

export default function ClientCatalog({ onNavigate }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedService, setSelectedService] = useState(null);
  const prefersReduced = useReducedMotion();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => PromotionsApi.list(),
  });

  const activeServices = services.filter(s => s.is_active !== false);
  const categories = ["all", ...new Set(activeServices.map(s => s.category))];

  const filtered = selectedCategory === "all"
    ? activeServices
    : activeServices.filter(s => s.category === selectedCategory);

  const getPromo = (svcId) => promotions.find(p => p.is_active && p.service_id === svcId);

  const getFinalPrice = (svc) => {
    const promo = getPromo(svc.id);
    if (!promo) return svc.price;
    return promo.discount_type === "percent"
      ? svc.price * (1 - promo.discount_value / 100)
      : svc.price - promo.discount_value;
  };

  return (
    <div className="pb-6">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto px-5 py-4 -mx-0 scrollbar-hide">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
          ))
        ) : (
        categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all duration-150 shrink-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedCategory === cat
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border/50 text-muted-foreground"
            )}
          >
            {cat === "all" ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5" /> Todos
              </>
            ) : (
              <>
                <ServiceCategoryIcon category={cat} className="w-3.5 h-3.5" />
                {categoryLabels[cat] || cat}
              </>
            )}
          </button>
        ))
        )}
      </div>

      {/* Service grid (stagger individual por item) */}
      <div key={selectedCategory} className="px-5 grid grid-cols-2 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))
        ) : (
        filtered.map((svc, i) => {
          const promo = getPromo(svc.id);
          const finalPrice = getFinalPrice(svc);
          return (
            <Reveal key={svc.id} index={i} className="min-w-0 h-full">
              <button
                onClick={() => setSelectedService(svc)}
                className="w-full h-full bg-card/90 border border-border/60 rounded-2xl overflow-hidden text-left hover:border-primary/30 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex flex-col shadow-[0_8px_20px_-18px_hsl(var(--foreground)/0.4)]"
              >
              <div className="relative">
                <img
                  src={categoryPhotos[svc.category] || categoryPhotos.outros}
                  alt={svc.name}
                  className="w-full h-28 object-cover"
                />
                {promo && (
                  <span className="absolute top-2 right-2 bg-foreground text-background text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {promo.discount_type === "percent" ? `-${promo.discount_value}%` : `-${formatBRL(promo.discount_value)}`}
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1">
                <p className="font-semibold text-sm leading-tight line-clamp-2">{svc.name}</p>
                <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{svc.duration_minutes}min</span>
                </div>
                <div className="mt-auto pt-2 flex items-baseline gap-1.5">
                  {promo && <p className="text-xs line-through text-muted-foreground tabular-nums">{formatBRL(svc.price)}</p>}
                  <p className="font-heading font-bold tracking-tight text-sm tabular-nums">{formatBRL(finalPrice)}</p>
                </div>
              </div>
              </button>
            </Reveal>
          );
        })
        )}
      </div>

      {/* Service detail sheet (sobe de baixo) */}
      <AnimatePresence>
        {selectedService && (
          <ServiceDetail
            service={selectedService}
            promo={getPromo(selectedService.id)}
            finalPrice={getFinalPrice(selectedService)}
            onClose={() => setSelectedService(null)}
            onBook={() => { setSelectedService(null); onNavigate("agendar"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceDetail({ service, promo, finalPrice, onClose, onBook }) {
  const prefersReduced = useReducedMotion();
  const isReduced = prefersReduced === true;
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={isReduced ? { duration: 0 } : { duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-background rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={isReduced ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 320 }}
      >
        {/* Image */}
        <div className="relative shrink-0">
          <img
            src={categoryPhotos[service.category] || categoryPhotos.outros}
            alt={service.name}
            className="w-full h-52 object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          {promo && (
            <span className="absolute top-4 left-4 bg-foreground text-background text-xs font-bold px-2 py-1 rounded-full">
              {promo.discount_type === "percent" ? `-${promo.discount_value}%` : `-${formatBRL(promo.discount_value)}`}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium tracking-wide">
              <ServiceCategoryIcon category={service.category} className="w-3.5 h-3.5" />
              <span>{categoryLabels[service.category] || service.category}</span>
            </div>
            <h2 className="text-2xl font-heading font-bold tracking-tight mt-1">{service.name}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-muted rounded-xl px-3 py-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{service.duration_minutes} min</span>
            </div>
            <div>
              {promo && <p className="text-xs line-through text-muted-foreground tabular-nums">{formatBRL(service.price)}</p>}
              <p className="text-2xl font-heading font-bold tracking-tight tabular-nums">{formatBRL(finalPrice)}</p>
            </div>
          </div>

          {service.description && (
            <div>
              <h3 className="text-sm font-semibold mb-1">Sobre o serviço</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
            </div>
          )}

          {promo && (
            <div className="bg-secondary/40 border border-secondary rounded-2xl p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><Tag className="w-4 h-4" /> {promo.name}</p>
              {promo.description && <p className="text-xs text-muted-foreground mt-1">{promo.description}</p>}
              {promo.rules && <p className="text-xs text-muted-foreground mt-1">{promo.rules}</p>}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="p-5 pb-8 border-t border-border/50 shrink-0">
          <Button className="w-full h-12 rounded-full font-semibold text-base gap-2" onClick={onBook}>
            <CalendarPlus className="w-4 h-4" /> Agendar este serviço
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
