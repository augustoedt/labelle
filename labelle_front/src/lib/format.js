const brl = (decimals) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const whole = brl(0);
const cents = brl(2);

/** Valor monetário em R$ — inteiro (R$ 1.234) ou com centavos (R$ 1.234,56). */
export function formatBRL(value, { decimals = 0 } = {}) {
  const n = Number(value) || 0;
  return (decimals === 2 ? cents : whole).format(n);
}
