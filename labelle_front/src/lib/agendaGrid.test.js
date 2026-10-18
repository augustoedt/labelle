import test from "node:test";
import assert from "node:assert/strict";
import {dayColumns, gridRange, appointmentLanes} from "./agendaGrid.js";
test("empty active workday columns remain visible; existing reservations outside workday remain accessible",()=>{
 const people=[{id:"a",is_active:true,work_days:[1]},{id:"b",is_active:true,work_days:[2]},{id:"c",is_active:false}];
 assert.deepEqual(dayColumns(people,[],1).map(p=>p.id),["a"]);
 assert.deepEqual(dayColumns(people,[{professional_id:"c"}],1).map(p=>p.id),["a","c"]);
});
test("time range includes early work and reservations after closing",()=>{
 assert.deepEqual(gridRange([{work_start:"07:00:00",work_end:"18:00:00"}],[{time:"19:15",duration_minutes:90}]),{start:420,end:1260});
});
test("overlapping bookings receive separate lanes and adjacent bookings reuse them",()=>{
 const rows=appointmentLanes([{id:"a",time:"09:00",duration_minutes:60},{id:"b",time:"09:30",duration_minutes:30},{id:"c",time:"10:00",duration_minutes:30}]);
 assert.equal(rows[0].lanes,2);assert.notEqual(rows[0].lane,rows[1].lane);assert.equal(rows[2].lanes,1);
});
