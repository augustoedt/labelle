export const categoryPhotos = {
  cabelo:
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=85",
  unha: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=85",
  estetica:
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=85",
  sobrancelha:
    "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=85",
  maquiagem:
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=85",
  outros:
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=85",
};
export const categoryDescriptions = {
  cabelo: "Cortes, escovas e tratamentos",
  unha: "Manicure, pedicure e nail design",
  estetica: "Seu momento de autocuidado",
  sobrancelha: "Design e cuidado com o olhar",
  maquiagem: "Beleza para cada ocasião",
  outros: "Descubra todos os cuidados",
};
export function durationLabel(service, variants) {
  const options = variants.filter(
    (v) => v.service_id === service.id && v.is_active !== false,
  );
  const durations = options.length
    ? options.map((v) => Number(v.duration_minutes))
    : [Number(service.duration_minutes)];
  const min = Math.min(...durations),
    max = Math.max(...durations);
  return min === max ? `${min} min` : `${min}–${max} min`;
}
