import test from 'node:test';
import assert from 'node:assert/strict';
import { clientMatchesSearch, clientWithExactPhone } from './clientIdentification.js';

const clients = [
  { id: 'a', name: 'Ana Souza', phone: '(11) 98765-4321', phone_normalized: '5511987654321', is_active: true },
  { id: 'b', name: 'Luiza', phone: '1133334444', phone_normalized: '551133334444', is_active: true },
  { id: 'c', name: 'Ana Inativa', phone: '11911112222', phone_normalized: '5511911112222', is_active: false },
];

test('busca seleção por nome ou telefone parcial, sem selecionar automaticamente', () => {
  assert.deepEqual(clients.filter(c => clientMatchesSearch(c, 'Ana')).map(c => c.id), ['a']);
  assert.deepEqual(clients.filter(c => clientMatchesSearch(c, '3333')).map(c => c.id), ['b']);
  assert.deepEqual(clients.filter(c => clientMatchesSearch(c, '98765')).map(c => c.id), ['a']);
});

test('entrada direta só encontra cliente com número completo e exato', () => {
  assert.equal(clientWithExactPhone(clients, '11987654321')?.id, 'a');
  assert.equal(clientWithExactPhone(clients, '+55 (11) 3333-4444')?.id, 'b');
  assert.equal(clientWithExactPhone(clients, '98765'), null);
  assert.equal(clientWithExactPhone(clients, '11987654320'), null);
});
