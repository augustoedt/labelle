import { normalizePhone } from "./clientUtils.js";
import { normalizeSearch } from "./serviceCatalog.js";

// Busca parcial apenas para escolher explicitamente um cadastro existente.
export function clientMatchesSearch(client, text) {
  if (client.is_active === false) return false;
  const digits = normalizePhone(text);
  return normalizeSearch(client.name).includes(normalizeSearch(text)) ||
    (digits.length > 0 && normalizePhone(client.phone).includes(digits));
}

// A entrada direta de telefone nunca usa prefixo ou nome para vincular.
export function clientWithExactPhone(clients, phone) {
  const digits = normalizePhone(phone);
  if (![10, 11].includes(digits.length)) return null;
  return clients?.find(client => client.phone_normalized === `55${digits}`) || null;
}
