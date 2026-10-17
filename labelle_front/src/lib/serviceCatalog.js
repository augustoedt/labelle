export function activeVariants(variants, serviceId) {
  return variants.filter(
    (v) => v.service_id === serviceId && v.is_active !== false,
  );
}
export function serviceOptions(service, variants) {
  const options = activeVariants(variants, service.id);
  return options.length ? options : [service];
}
export function promotionFor(promotions, serviceId) {
  return promotions.find((p) => p.is_active && p.service_id === serviceId);
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
