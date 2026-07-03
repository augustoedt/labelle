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

/**
 * Faz upsert do cliente pelo telefone normalizado.
 * Retorna o cliente_id (existente ou novo).
 */
export async function upsertClientByPhone(base44Entities, { name, phone, source = "app_cliente" }) {
  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm) throw new Error("Telefone inválido");

  // Busca cliente existente pelo telefone normalizado
  const existing = await base44Entities.Client.filter({ phone_normalized: phoneNorm });

  if (existing && existing.length > 0) {
    const client = existing[0];
    // Atualiza nome se for diferente
    const updates = {};
    if (name && name.trim() !== client.name) {
      updates.name = name.trim();
    }
    updates.last_appointment_date = new Date().toISOString().slice(0, 10);
    updates.visit_count = (client.visit_count || 0) + 1;

    await base44Entities.Client.update(client.id, updates);
    return client.id;
  } else {
    // Cria novo cliente
    const today = new Date().toISOString().slice(0, 10);
    const newClient = await base44Entities.Client.create({
      name: name.trim(),
      phone,
      phone_normalized: phoneNorm,
      source,
      is_active: true,
      loyalty_tier: "bronze",
      loyalty_points: 0,
      total_spent: 0,
      visit_count: 1,
      first_appointment_date: today,
      last_appointment_date: today,
    });
    return newClient.id;
  }
}