const escapeText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
const foldLine = (line) => {
  let result = "",
    bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      result += "\r\n ";
      bytes = 1;
    }
    result += char;
    bytes += size;
  }
  return result;
};
const stamp = (date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
export function appointmentCalendar(appointment, now = new Date()) {
  if (appointment.status !== "confirmado")
    throw new Error("O salão precisa confirmar o agendamento primeiro.");
  const start = new Date(`${appointment.date}T${appointment.time}-03:00`);
  const end = new Date(
    start.getTime() + (appointment.duration_minutes || 60) * 60000,
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Belle Studio//Agendamentos//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@labelle`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText("La Belle Studio — " + appointment.service_name)}`,
    `DESCRIPTION:${escapeText("Atendimento com " + appointment.professional_name)}`,
    "STATUS:CONFIRMED",
    ...["-P1D", "-PT1H"].flatMap((trigger) => [
      "BEGIN:VALARM",
      `TRIGGER:${trigger}`,
      "ACTION:DISPLAY",
      "DESCRIPTION:Lembrete de atendimento La Belle Studio",
      "END:VALARM",
    ]),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map(foldLine)
    .join("\r\n");
}
export function downloadAppointmentCalendar(appointment) {
  const blob = new Blob([appointmentCalendar(appointment)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "la-belle-agendamento.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
