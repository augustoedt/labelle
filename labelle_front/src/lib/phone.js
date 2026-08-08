import { normalizePhone } from "@/lib/clientUtils";

/**
 * Máscara de telefone BR progressiva enquanto digita:
 * (11) 99999-9999 (celular) ou (11) 9999-9999 (fixo).
 */
export function maskPhone(value) {
  const digits = normalizePhone(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Telefone BR válido: 10 (fixo) ou 11 (celular) dígitos. */
export function isValidPhone(value) {
  const d = normalizePhone(value);
  return d.length === 10 || d.length === 11;
}
