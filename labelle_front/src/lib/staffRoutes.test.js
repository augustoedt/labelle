import test from 'node:test'
import assert from 'node:assert/strict'
import { roleHome, safeStaffReturnTo, validateStaffSearch } from './staffRoutes.ts'

test('role home is explicit and unknown roles never reach staff routes', () => {
  assert.equal(roleHome('admin'), '/admin')
  assert.equal(roleHome('profissional'), '/profissional/agenda')
  assert.equal(roleHome('other'), '/')
})

test('return destination accepts only matching role and local paths', () => {
  assert.equal(safeStaffReturnTo('/admin/agenda?date=2026-10-17', 'admin'), '/admin/agenda?date=2026-10-17')
  assert.equal(safeStaffReturnTo('/admin/agenda', 'profissional'), undefined)
  assert.equal(safeStaffReturnTo('/profissional/agenda', 'admin'), undefined)
  assert.equal(safeStaffReturnTo('//evil.example/admin', 'admin'), undefined)
  assert.equal(safeStaffReturnTo('/admin/../../evil', 'admin'), undefined)
  assert.equal(safeStaffReturnTo('/admin/agenda', 'anonymous'), undefined)
})

test('legacy staff URLs resolve to the role namespace', () => {
  assert.equal(safeStaffReturnTo('/agenda?date=2026-10-17', 'admin'), '/admin/agenda?date=2026-10-17')
  assert.equal(safeStaffReturnTo('/minha-agenda?date=2026-10-17', 'profissional'), '/profissional/agenda?date=2026-10-17')
  assert.equal(safeStaffReturnTo('/minhas-comissoes?month=2026-10', 'profissional'), '/profissional/comissoes?month=2026-10')
  assert.equal(safeStaffReturnTo('/financeiro', 'profissional'), undefined)
})

test('client search cannot leak phone or name into return links', () => {
  assert.equal(safeStaffReturnTo('/clientes?q=11999999999&client=abc', 'admin'), '/admin/clientes?client=abc')
  assert.equal(safeStaffReturnTo('/profissional/clientes?q=Ana&client=abc', 'profissional'), '/profissional/clientes?client=abc')
})

test('staff query validation keeps only supported non-sensitive state', () => {
  assert.deepEqual(validateStaffSearch({ view: 'wrong', period: 'year', status: 'invalid', month: '2026-13', token: 'secret' }), {})
  assert.deepEqual(validateStaffSearch({ service: 'abc', view: 'edit', lowStock: 'true', month: '2026-10' }), {
    service: 'abc', view: 'edit', month: '2026-10', lowStock: true,
  })
})

 test('slot time survives safe navigation and rejects invalid hours',()=>{assert.equal(validateStaffSearch({time:'10:30'}).time,'10:30');assert.equal(validateStaffSearch({time:'25:00'}).time,undefined);});
