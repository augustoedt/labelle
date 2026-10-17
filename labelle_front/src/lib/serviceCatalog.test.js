import test from "node:test";
import assert from "node:assert/strict";
import {
  minimumPrice,
  finalPrice,
  activeVariants,
  availableService,
} from "./serviceCatalog.js";
import { appointmentCalendar } from "./appointmentCalendar.js";
const service = { id: "s", price: 20, is_active: true };
const variants = [
  { service_id: "s", price: 60, is_active: true },
  { service_id: "s", price: 30, is_active: true },
  { service_id: "s", price: 10, is_active: false },
];
test("catalog price uses active variants and the same promotion calculation as checkout", () => {
  const promo = { discount_type: "percent", discount_value: 10 };
  assert.equal(minimumPrice(service, variants, promo), 27);
  assert.equal(finalPrice(variants[0], promo), 54);
  assert.equal(activeVariants(variants, "s").length, 2);
  assert.equal(
    finalPrice(service, { discount_type: "value", discount_value: 90 }),
    0,
  );
});
test("a service whose variations were disabled cannot fall back to the base price", () => {
  assert.equal(
    availableService(
      service,
      variants.map((v) => ({ ...v, is_active: false })),
    ),
    false,
  );
  assert.equal(availableService(service, []), true);
});
test("calendar exports actual variant duration and phone calendar reminders in UTC", () => {
  const appointment = {
    id: "123",
    status: "confirmado",
    date: "2026-10-20",
    time: "14:00:00",
    duration_minutes: 40,
    service_name: "Escova — G",
    professional_name: "Maria",
  };
  const calendar = appointmentCalendar(
    appointment,
    new Date("2026-10-17T00:00:00Z"),
  );
  assert.match(calendar, /DTSTART:20261020T170000Z/);
  assert.match(calendar, /DTEND:20261020T174000Z/);
  assert.match(calendar, /TRIGGER:-P1D/);
  assert.match(calendar, /TRIGGER:-PT1H/);
  assert.throws(() =>
    appointmentCalendar({ ...appointment, status: "agendado" }),
  );
});
