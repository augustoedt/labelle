// Identidade única dos tiers de fidelidade (cores e rótulos).
// ATENÇÃO: os limites numéricos de pontos divergem entre o admin
// (Loyalty.jsx: 0/100/300/600) e o app da cliente (ClientLoyalty.jsx:
// 0/500/1000/2000) — decisão de produto pendente; por isso os `min`/`max`
// continuam definidos localmente em cada tela.

export const tierLabels = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
  vip: "VIP",
};

// Badge suave (admin)
export const tierColors = {
  bronze: "bg-amber-100 text-amber-800",
  prata: "bg-slate-100 text-slate-700",
  ouro: "bg-yellow-100 text-yellow-800",
  vip: "bg-primary/10 text-primary",
};

// Cor sólida (barra de progresso no app da cliente)
export const tierSolidColors = {
  bronze: "bg-amber-700",
  prata: "bg-gray-400",
  ouro: "bg-yellow-500",
  vip: "bg-foreground",
};

export const tierEmojis = {
  bronze: "🥉",
  prata: "🥈",
  ouro: "🥇",
  vip: "💎",
};
