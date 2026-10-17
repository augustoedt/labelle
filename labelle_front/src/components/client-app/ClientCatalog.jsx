import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ServicesApi, ServiceVariantsApi, PromotionsApi } from "@/server/api";
import { CalendarPlus, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import ServiceCategoryIcon, {
  categoryLabels,
} from "@/components/ui/ServiceCategoryIcon";
import {
  activeVariants,
  minimumPrice,
  finalPrice,
  promotionFor,
  normalizeSearch,
  availableService,
} from "@/lib/serviceCatalog";

const photos = {
  cabelo:
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80",
  unha: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80",
  estetica:
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
  maquiagem:
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
};
export default function ClientCatalog({ onNavigate, onBook }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [service, setService] = useState(null);
  const [variant, setVariant] = useState(null);
  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => ServicesApi.list(),
  });
  const variantsQuery = useQuery({
    queryKey: ["service-variants"],
    queryFn: () => ServiceVariantsApi.list({ limit: 1000 }),
  });
  const promotionsQuery = useQuery({
    queryKey: ["promotions"],
    queryFn: () => PromotionsApi.list(),
  });
  const services = (servicesQuery.data || []).filter(
    (s) => s.is_active !== false,
  );
  const variants = variantsQuery.data || [];
  const promotions = promotionsQuery.data || [];
  const loading =
    servicesQuery.isPending ||
    variantsQuery.isPending ||
    promotionsQuery.isPending;
  const error =
    servicesQuery.isError || variantsQuery.isError || promotionsQuery.isError;
  const filtered = services
    .filter((s) => availableService(s, variants))
    .filter(
      (s) =>
        (category === "all" || s.category === category) &&
        normalizeSearch(s.name + " " + (s.description || "")).includes(
          normalizeSearch(search),
        ),
    );
  const options = service ? activeVariants(variants, service.id) : [];
  const option = variant || service;
  const promo = service && promotionFor(promotions, service.id);
  return (
    <div className="px-5 py-6 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Seu momento de cuidado
        </p>
        <h1 className="font-heading text-3xl mt-1">Nosso catálogo</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Encontre seu serviço e escolha a opção ideal para você.
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Buscar serviços"
          className="pl-10 rounded-full bg-card"
          placeholder="Buscar serviço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Categorias">
        {["all", ...new Set(services.map((s) => s.category))].map((cat) => (
          <button
            key={cat}
            aria-pressed={category === cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-full whitespace-nowrap px-4 py-2 text-sm border transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              category === cat
                ? "bg-primary/25 border-primary text-foreground"
                : "bg-card border-border text-muted-foreground",
            )}
          >
            {cat === "all" ? "Todos" : categoryLabels[cat] || cat}
          </button>
        ))}
      </div>
      {error ? (
        <div role="alert" className="bg-card border rounded-2xl p-5">
          <p>Não foi possível carregar o catálogo.</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              servicesQuery.refetch();
              variantsQuery.refetch();
              promotionsQuery.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {filtered.length} serviços encontrados
          </p>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum serviço encontrado. Tente outro nome ou categoria.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((s) => {
              const choices = activeVariants(variants, s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setService(s);
                    setVariant(null);
                  }}
                  className="bg-card rounded-2xl border border-border/60 overflow-hidden text-left shadow-sm hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={photos[s.category] || photos.cabelo}
                    alt=""
                    loading="lazy"
                    className="h-32 w-full object-cover"
                  />
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {categoryLabels[s.category] || s.category}
                    </p>
                    <h2 className="font-semibold">{s.name}</h2>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">
                      {s.description ||
                        "Cuidado profissional para valorizar sua beleza."}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {choices.length
                        ? `${Math.min(...choices.map((v) => v.duration_minutes))}–${Math.max(...choices.map((v) => v.duration_minutes))}`
                        : s.duration_minutes}{" "}
                      min
                    </p>
                    <p className="font-semibold">
                      {choices.length > 0 && (
                        <span className="block text-xs text-muted-foreground font-normal">
                          A partir de
                        </span>
                      )}
                      {formatBRL(
                        minimumPrice(
                          s,
                          variants,
                          promotionFor(promotions, s.id),
                        ),
                      )}
                    </p>
                    <span className="block text-xs font-medium pt-1">
                      Ver opções →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      <Sheet
        open={!!service}
        onOpenChange={(open) => {
          if (!open) setService(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[90dvh] overflow-y-auto max-w-lg mx-auto"
        >
          {service && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading text-2xl">
                  {service.name}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pt-4 pb-8">
                <p className="text-sm text-muted-foreground">
                  {service.description ||
                    "Escolha seu atendimento e envie uma solicitação ao salão."}
                </p>
                {options.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold mb-2">
                      Escolha sua opção
                    </legend>
                    {options.map((v) => (
                      <label
                        key={v.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer",
                          variant?.id === v.id
                            ? "border-primary bg-secondary"
                            : "bg-card",
                        )}
                      >
                        <input
                          type="radio"
                          name="catalog-variant"
                          checked={variant?.id === v.id}
                          onChange={() => setVariant(v)}
                        />
                        <span className="flex-1">
                          <span className="font-semibold">{v.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {v.description} · {v.duration_minutes} min
                          </span>
                        </span>
                        <span className="font-medium">
                          {formatBRL(finalPrice(v, promo))}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}
                {(!options.length || variant) && (
                  <div className="flex justify-between items-center rounded-xl bg-secondary p-4">
                    <span className="text-sm">
                      {option.duration_minutes} minutos
                    </span>
                    <strong className="text-xl">
                      {formatBRL(finalPrice(option, promo))}
                    </strong>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  O salão confere a agenda e confirma sua solicitação.
                </p>
                <Button
                  disabled={options.length > 0 && !variant}
                  className="w-full rounded-full h-12 gap-2"
                  onClick={() => {
                    if (onBook)
                      onBook({
                        serviceId: service.id,
                        variantId: variant?.id || null,
                      });
                    else onNavigate("agendar");
                    setService(null);
                  }}
                >
                  <CalendarPlus className="h-4 w-4" /> Agendar este serviço
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
