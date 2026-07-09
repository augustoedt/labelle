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

