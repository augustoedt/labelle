export function activeVariants(variants, serviceId) {
  return variants
    .filter((v) => v.service_id === serviceId && v.is_active !== false)
    .sort((a, b) => {
      const order = { P: 0, M: 1, G: 2 };
      return (
        (order[a.name] ?? 10) - (order[b.name] ?? 10) ||
        String(a.name || "").localeCompare(String(b.name || ""), "pt-BR")
      );
    });
}
export function serviceOptions(service, variants) {
  const options = activeVariants(variants, service.id);
  return options.length ? options : [service];
}
export function promotionFor(promotions, serviceId, salonDate) {
  const date =
    salonDate ||
    new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return promotions
    .filter(
      (promotion) =>
        promotion.is_active === true &&
        promotion.service_id === serviceId &&
        (!promotion.start_date || promotion.start_date <= date) &&
        (!promotion.end_date || promotion.end_date >= date),
    )
    .sort((a, b) => {
      const firstId = String(a.id ?? "");
      const secondId = String(b.id ?? "");
      return firstId < secondId ? -1 : firstId > secondId ? 1 : 0;
    })[0];
}
export function finalPrice(option, promotion) {
  const price = Number(option?.price || 0);
  if (!promotion) return price;
  const discount = Number(promotion.discount_value || 0);
  return Math.max(
    0,
    Math.round(
      (promotion.discount_type === "percent"
        ? price * (1 - discount / 100)
        : price - discount) * 100,
    ) / 100,
  );
}
export function minimumPrice(service, variants, promotion) {
  return Math.min(
    ...serviceOptions(service, variants).map((v) => finalPrice(v, promotion)),
  );
}
export function normalizeSearch(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function availableService(service, variants) {
  return (
    service.is_active !== false &&
    (!variants.some((v) => v.service_id === service.id) ||
      activeVariants(variants, service.id).length > 0)
  );
}
