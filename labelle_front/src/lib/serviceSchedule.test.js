import test from "node:test";
import assert from "node:assert/strict";
import {serviceScheduleEntries} from "./serviceSchedule.js";
test("simultaneous services retain their professional, duration and parent identity",()=>{
 const apt={id:"a",professional_id:"p",date:"2026-10-18",time:"10:00",duration_minutes:60,professional_referral:true};
 const entries=serviceScheduleEntries([apt],[{id:"i",appointment_id:"a",professional_id:"q",service_name:"Unhas",duration_minutes:30},{id:"j",appointment_id:"a",professional_id:"p",service_name:"Escova",duration_minutes:40}]);
 assert.equal(entries.length,3);assert.equal(new Set(entries.map(e=>e.id)).size,3);
 assert.deepEqual(entries.map(e=>e.professional_id),["p","q","p"]);
 assert.deepEqual(entries.map(e=>e.time),["10:00","10:00","10:00"]);
 assert.equal(entries[1].root_appointment_id,"a");assert.equal(entries[1].duration_minutes,30);assert.equal(entries[1].professional_referral,false);
});
