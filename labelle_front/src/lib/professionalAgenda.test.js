import test from "node:test";
import assert from "node:assert/strict";
import {agendaProfessionals, nextProfessionalId, swipeProfessionalDirection, gentlePeriodOffset} from "./professionalAgenda.js";

const people = count => Array.from({length: count}, (_, index) => ({
  id: `p${index + 1}`, name: `Profissional ${index + 1}`, is_active: true,
  work_days: [index % 7],
}));
const ids = rows => rows.map(row => row.id);

for (const count of [4, 6]) {
  test(`${count} active professionals remain selectable with no bookings, including days off`, () => {
    const professionals = people(count);
    assert.deepEqual(agendaProfessionals(professionals, [], 6), professionals);
    assert.deepEqual(agendaProfessionals(professionals, [], 0), professionals);
  });
}

test("API order stays stable and inactive professionals appear only when booked", () => {
  const professionals = [
    {id: "inactive-empty", is_active: false},
    {id: "b", is_active: true, work_days: [2]},
    {id: "inactive-booked", is_active: false},
    {id: "a", is_active: true},
    {id: "b", is_active: true},
  ];
  const entries = [{professional_id: "inactive-booked"}];
  assert.deepEqual(ids(agendaProfessionals(professionals, entries, 1)), ["b", "inactive-booked", "a"]);
  assert.deepEqual(ids(agendaProfessionals(professionals, [], 1)), ["b", "a"]);
});

test("unknown or missing professionals share one fallback without hiding services", () => {
  const professionals = people(4);
  const entries = [
    {professional_id: "p2"}, {professional_id: "deleted"},
    {professional_id: null}, {}, {professional_id: "another-deleted"},
  ];
  const visible = agendaProfessionals(professionals, entries, 1);
  assert.deepEqual(ids(visible), ["p1", "p2", "p3", "p4", "unassigned"]);
  assert.equal(visible.at(-1).name, "Outros / sem vínculo");
  assert.equal(visible.at(-1).is_active, false);
  assert.deepEqual(agendaProfessionals([], [], 1), []);
  assert.deepEqual(ids(agendaProfessionals([], entries, 1)), ["unassigned"]);
});

test("selection list does not mutate professionals or service entries", () => {
  const professional = Object.freeze({id: "p", is_active: true, work_days: Object.freeze([1])});
  const professionals = Object.freeze([professional]);
  const entries = Object.freeze([Object.freeze({professional_id: "missing"})]);
  const visible = agendaProfessionals(professionals, entries, 2);
  assert.equal(visible[0], professional);
  assert.equal(professionals.length, 1);
  assert.equal(entries.length, 1);
});

test("navigation visits all six professionals in order without cycling at either end", () => {
  const professionals = people(6);
  let selected = "p1";
  const visited = [selected];
  for (let index = 0; index < 5; index++) {
    selected = nextProfessionalId(professionals, selected, 1);
    visited.push(selected);
  }
  assert.deepEqual(visited, ids(professionals));
  assert.equal(nextProfessionalId(professionals, "p6", 1), "p6");
  assert.equal(nextProfessionalId(professionals, "p1", -1), "p1");
  assert.equal(nextProfessionalId(professionals, "p4", -1), "p3");
  assert.equal(nextProfessionalId(professionals, "p4", 0), "p4");
});

test("navigation recovers from missing selections and handles a single or empty list", () => {
  assert.equal(nextProfessionalId(people(4), "removed", 1), "p1");
  assert.equal(nextProfessionalId(people(4), null, -1), "p1");
  assert.equal(nextProfessionalId(people(1), "p1", 1), "p1");
  assert.equal(nextProfessionalId(people(1), "p1", -1), "p1");
  assert.equal(nextProfessionalId([], "p1", 1), null);
});

test("rightward gestures advance and leftward gestures go back at the movement and duration boundaries", () => {
  assert.equal(swipeProfessionalDirection({dx: 56, dy: 0, durationMs: 1000}), 1);
  assert.equal(swipeProfessionalDirection({dx: -56, dy: 0, durationMs: 0}), -1);
  assert.equal(swipeProfessionalDirection({dx: 90, dy: 60, durationMs: 300}), 1);
  assert.equal(swipeProfessionalDirection({dx: -90, dy: -60, durationMs: 300}), -1);
});

test("small, slow, vertical and diagonal gestures do not change the professional", () => {
  for (const gesture of [
    {dx: 55, dy: 0, durationMs: 300},
    {dx: 0, dy: 100, durationMs: 300},
    {dx: 90, dy: 61, durationMs: 300},
    {dx: -90, dy: -100, durationMs: 300},
    {dx: 100, dy: 0, durationMs: 1001},
    {dx: 100, dy: 0, durationMs: -1},
    {dx: NaN, dy: 0, durationMs: 300},
    {dx: 100, dy: 0},
  ]) assert.equal(swipeProfessionalDirection(gesture), 0);
  assert.equal(swipeProfessionalDirection(), 0);
});

test("period alignment gently frames morning, afternoon and the final scroll boundary", () => {
  const anchors = [0, 384, 600];
  assert.equal(gentlePeriodOffset(12, anchors, 600), 0);
  assert.equal(gentlePeriodOffset(372, anchors, 600), 384);
  assert.equal(gentlePeriodOffset(396, anchors, 600), 384);
  assert.equal(gentlePeriodOffset(588, anchors, 600), 600);
  assert.equal(gentlePeriodOffset(384, anchors, 600), null);
  assert.equal(gentlePeriodOffset(0, anchors, 600), null);
  assert.equal(gentlePeriodOffset(600, anchors, 600), null);
});

test("intermediate scroll stops stay free and the tolerance never captures distant stops", () => {
  const anchors = [0, 384, 600];
  for (const stop of [144, 270, 19, 365, 403]) {
    assert.equal(gentlePeriodOffset(stop, anchors, 600), null);
  }
  assert.equal(gentlePeriodOffset(18, anchors, 600), 0);
  assert.equal(gentlePeriodOffset(366, anchors, 600), 384);
  assert.equal(gentlePeriodOffset(402, anchors, 600), 384);
  assert.equal(gentlePeriodOffset(12, anchors, 600, 12), 0);
  assert.equal(gentlePeriodOffset(13, anchors, 600, 12), null);
  assert.equal(gentlePeriodOffset(1, anchors, 600), null);
  assert.equal(gentlePeriodOffset(383, anchors, 600), null);
});

test("period anchors clamp to the real scroll range without mutating the input", () => {
  const anchors = Object.freeze([-50, 384, 800]);
  assert.equal(gentlePeriodOffset(12, anchors, 500), 0);
  assert.equal(gentlePeriodOffset(490, anchors, 500), 500);
  assert.equal(gentlePeriodOffset(12, [384], 0), 0);
  assert.equal(gentlePeriodOffset(0, [384], 0), null);
  assert.deepEqual(anchors, [-50, 384, 800]);
});

test("period alignment ignores non-finite anchors and rejects invalid scroll parameters", () => {
  assert.equal(gentlePeriodOffset(372, [NaN, Infinity, null, "384", 384], 600), 384);
  for (const anchors of [[], [NaN, Infinity], null, undefined, {}]) {
    assert.equal(gentlePeriodOffset(12, anchors, 600), null);
  }
  for (const current of [NaN, Infinity, undefined, null, "12"]) {
    assert.equal(gentlePeriodOffset(current, [0], 600), null);
  }
  for (const maxScroll of [-1, NaN, Infinity, undefined, null, "600"]) {
    assert.equal(gentlePeriodOffset(12, [0], maxScroll), null);
  }
  for (const tolerance of [-1, NaN, Infinity, null, "18"]) {
    assert.equal(gentlePeriodOffset(12, [0], 600, tolerance), null);
  }
});
