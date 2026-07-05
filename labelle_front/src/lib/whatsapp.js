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
 * Substitui os placeholders `{{chave}}` do template pelos valores fornecidos.
 * Os templates em si vêm das Configurações do estúdio (Settings), editáveis
 * pelo staff — este helper só faz a interpolação.
 */
function renderTemplate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value ?? ""),
    template
  );
}

function formatDate(date) {
  return date
    ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    : date;
}

/**
 * Builds a confirmation message for a newly created appointment, a partir do
 * template configurável `settings.message_confirmation`.
 */
export function buildConfirmationMessage(settings, { clientName, serviceName, professionalName, date, time }) {
  return renderTemplate(settings.message_confirmation, {
    cliente: clientName,
    estudio: settings.name,
    servico: serviceName,
    profissional: professionalName,
    data: formatDate(date),
    hora: time,
  });
}

/**
 * Builds a reminder message for an upcoming appointment, a partir do
 * template configurável `settings.message_reminder`.
 */
export function buildReminderMessage(settings, { clientName, serviceName, professionalName, date, time }) {
  return renderTemplate(settings.message_reminder, {
    cliente: clientName,
    estudio: settings.name,
    servico: serviceName,
    profissional: professionalName,
    data: formatDate(date),
    hora: time,
  });
}

/**
 * Builds the "acabei de agendar" message that the CLIENT sends TO the
 * studio's WhatsApp right after booking via the client app — resolve o
 * problema de o wa.me abrir endereçado para o telefone da própria cliente
 * em vez do estúdio.
 */
export function buildNewBookingNotification(settings, { clientName, serviceName, professionalName, date, time, clientPhone }) {
  return renderTemplate(settings.message_new_booking_notification, {
    cliente: clientName,
    estudio: settings.name,
    servico: serviceName,
    profissional: professionalName,
    data: formatDate(date),
    hora: time,
    telefone_cliente: clientPhone,
    endereco: settings.address,
  });
}
