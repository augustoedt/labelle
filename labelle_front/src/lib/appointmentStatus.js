// Mapa único de status de agendamento (admin + profissional).
// O app da cliente (ClientHistory) tem variante visual própria, mais suave.

export const statusColors = {
  agendado: "bg-blue-100 text-blue-700",
  confirmado: "bg-emerald-100 text-emerald-700",
  em_atendimento: "bg-amber-100 text-amber-700",
  concluido: "bg-muted text-muted-foreground",
  cancelado: "bg-red-100 text-red-700",
};

export const statusLabels = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
