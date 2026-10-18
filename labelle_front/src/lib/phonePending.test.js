import test from "node:test";
import assert from "node:assert/strict";
import {hasPhone,phonePendingRecords} from "./phonePending.js";
test("DDD phone validation accepts national and country-prefixed numbers; empty and incomplete are pending",()=>{for(const p of ["(83) 99999-1234","5583999991234","8333331234"]) assert.ok(hasPhone(p));for(const p of [null,"","123","00000000000"]) assert.equal(hasPhone(p),false);});
test("all unlinked appointments remain listed even when names repeat; linked bookings do not duplicate client counts",()=>{
const rows=phonePendingRecords([{id:"c",name:"Ana",phone:"83999991234"}],[{id:"1",client_name:"Ana",client_phone:null},{id:"2",client_name:"Ana",client_phone:"83999991234"},{id:"3",client_id:"c",client_name:"Ana"}]);assert.equal(rows.length,3);assert.equal(rows.filter(r=>r.missing).length,1);assert.equal(rows.filter(r=>r.kind==="appointment").length,2);
});
