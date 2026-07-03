/**
 * Formats a phone number to digits only (international format with Brazil country code)
 */
function formatPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  // Add Brazil country code if not present
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return "55" + digits;
}

/**
 * Opens a WhatsApp link with the given message for a phone number.
 */
export function sendWhatsApp(phone, message) {
  if (!phone) return;
  const formatted = formatPhone(phone);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${formatted}?text=${encoded}`, "_blank");
}

/**
 * Builds a confirmation message for a newly created appointment.
 */
export function buildConfirmationMessage({ clientName, serviceName, professionalName, date, time }) {
  const dateFormatted = date
    ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    : date;
  return (
    `Olá, ${clientName}! 🌸\n\n` +
    `Seu agendamento na *La Belle Studio* foi confirmado:\n\n` +
    `✂️ *Serviço:* ${serviceName}\n` +
    `👩‍🎨 *Profissional:* ${professionalName}\n` +
    `📅 *Data:* ${dateFormatted}\n` +
    `🕐 *Horário:* ${time}\n\n` +
    `Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco.\n\n` +
    `Te esperamos! 💕`
  );
}

/**
 * Builds a reminder message for an upcoming appointment.
 */
export function buildReminderMessage({ clientName, serviceName, professionalName, date, time }) {
  const dateFormatted = date
    ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    : date;
  return (
    `Olá, ${clientName}! 🌸\n\n` +
    `Lembramos que você tem um horário marcado na *La Belle Studio* amanhã:\n\n` +
    `✂️ *Serviço:* ${serviceName}\n` +
    `👩‍🎨 *Profissional:* ${professionalName}\n` +
    `📅 *Data:* ${dateFormatted}\n` +
    `🕐 *Horário:* ${time}\n\n` +
    `Até amanhã! 💕`
  );
}