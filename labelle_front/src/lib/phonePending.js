export function hasPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return (national.length === 10 || national.length === 11) && !/^0+$/.test(national);
}
export function phonePendingRecords(clients, appointments) {
  // A name alone is not an identity: preserve every unlinked record for review.
  return [
    ...clients.map(c => ({key:`client-${c.id}`,kind:"client",id:c.id,name:c.name,phone:c.phone,missing:!hasPhone(c.phone)})),
    ...appointments.filter(a=>!a.client_id).map(a=>({key:`appointment-${a.id}`,kind:"appointment",id:a.id,name:a.client_name,phone:a.client_phone,date:a.date,professional:a.professional_name,missing:!hasPhone(a.client_phone)})),
  ];
}
