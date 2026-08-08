/**
 * Normaliza telefone: remove tudo que não é dígito,
 * remove prefixo +55 ou 55 se tiver 13/12 dígitos.
 */
export function normalizePhone(phone) {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  // Remove código do país 55 se ficar com 12 ou 13 dígitos
  if (digits.length === 13 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("55")) digits = digits.slice(2);
  return digits;
}
