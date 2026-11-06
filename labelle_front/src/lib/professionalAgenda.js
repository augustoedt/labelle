// Active professionals stay selectable even on days without working hours.
export function agendaProfessionals(professionals = [], serviceEntries = [], _weekday) {
  const unique = [];
  const knownIds = new Set();
  for (const professional of professionals) {
    if (!professional?.id || knownIds.has(professional.id)) continue;
    knownIds.add(professional.id);
    unique.push(professional);
  }
  const bookedIds = new Set(serviceEntries.map(entry => entry.professional_id));
  const visible = unique.filter(professional =>
    professional.is_active !== false || bookedIds.has(professional.id)
  );
  if (serviceEntries.some(entry => !knownIds.has(entry.professional_id))) {
    visible.push({id: "unassigned", name: "Outros / sem vínculo", is_active: false});
  }
  return visible;
}

export function nextProfessionalId(professionals = [], currentId, direction) {
  if (!professionals.length) return null;
  const index = professionals.findIndex(professional => professional.id === currentId);
  if (index < 0) return professionals[0].id;
  const step = Number.isFinite(direction) ? Math.sign(direction) : 0;
  const nextIndex = Math.max(0, Math.min(professionals.length - 1, index + step));
  return professionals[nextIndex].id;
}

export function swipeProfessionalDirection({dx, dy, durationMs} = {}) {
  if (![dx, dy, durationMs].every(Number.isFinite) || durationMs < 0 || durationMs > 1000) return 0;
  if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return Math.sign(dx);
}

// Only align a stop already close to a period boundary; intermediate stops stay free.
export function gentlePeriodOffset(current, anchors, maxScroll, tolerance = 18) {
  if (![current, maxScroll, tolerance].every(Number.isFinite) || maxScroll < 0 || tolerance < 0 || !Array.isArray(anchors)) return null;
  let nearest = null;
  let distance = Infinity;
  for (const anchor of anchors) {
    if (!Number.isFinite(anchor)) continue;
    const bounded = Math.max(0, Math.min(maxScroll, anchor));
    const delta = Math.abs(current - bounded);
    if (delta < distance) {
      nearest = bounded;
      distance = delta;
    }
  }
  return distance > 1 && distance <= tolerance ? nearest : null;
}
