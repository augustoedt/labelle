import test from "node:test";
import assert from "node:assert/strict";
import {
  minimumPrice,
  finalPrice,
  activeVariants,
  availableService,
  promotionFor,
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
test("promotion dates include their start and end salon dates", () => {
  const promotion = {
    id: "00000000-0000-0000-0000-000000000001",
    service_id: "s",
    is_active: true,
    start_date: "2026-10-17",
    end_date: "2026-10-20",
  };
  assert.equal(promotionFor([promotion], "s", "2026-10-17"), promotion);
  assert.equal(promotionFor([promotion], "s", "2026-10-20"), promotion);
  assert.equal(promotionFor([promotion], "s", "2026-10-16"), undefined);
  assert.equal(promotionFor([promotion], "s", "2026-10-21"), undefined);
});
test("promotion selection uses the smallest UUID among valid active promotions", () => {
  const promotions = [
    {
      id: "00000000-0000-0000-0000-000000000003",
      service_id: "s",
      is_active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000001",
      service_id: "s",
      is_active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000000",
      service_id: "s",
      is_active: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      service_id: "other",
      is_active: true,
    },
  ];
  assert.equal(promotionFor(promotions, "s", "2026-10-17"), promotions[1]);
  assert.equal(promotionFor([], "s", "2026-10-17"), undefined);
  assert.equal(
    promotionFor(
      [{ ...promotions[0], start_date: "2026-10-18" }],
      "s",
      "2026-10-17",
    ),
    undefined,
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

import { durationLabel } from "./brand.js";
test("P/M/G options use a stable size order and concise duration labels", () => {
  const options = [
    { service_id: "s", name: "G", price: 60, duration_minutes: 40 },
    { service_id: "s", name: "P", price: 45, duration_minutes: 30 },
    { service_id: "s", name: "M", price: 50, duration_minutes: 30 },
  ];
  assert.deepEqual(
    activeVariants(options, "s").map((v) => v.name),
    ["P", "M", "G"],
  );
  assert.equal(durationLabel(service, options), "30–40 min");
  assert.equal(durationLabel(service, [options[0]]), "40 min");
});

test("supplements are excluded from public offerings and category starting prices", () => {
  const offerings = [
    { id: "cut", name: "Corte", category: "cabelo", price: 50 },
    { id: "extra5", name: "Adicional", category: "cabelo", price: 5 },
    { id: "extra10", name: "Adicional química", category: "cabelo", price: 10 },
    { id: "extra20", name: "Modelagem", category: "Complemento", price: 20 },
  ];
  const publicServices = offerings.filter((s) => availableService(s, []));
  assert.deepEqual(publicServices.map((s) => s.id), ["cut"]);
  assert.equal(Math.min(...publicServices.map((s) => minimumPrice(s, []))), 50);
  assert.equal(availableService({ name: "Nail art", price: 5 }, []), true);
});
