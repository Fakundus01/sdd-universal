import { test } from 'node:test';
import assert from 'node:assert/strict';
import catalogo from '../_lib/catalogo.js';

const { tipoValido, stackValido, datosDelCatalogo } = catalogo;

test('AC7: tipo y stack del catálogo real son válidos', () => {
  const { TYPES, STACKS } = datosDelCatalogo();
  assert.ok(Object.keys(TYPES).length > 0);
  assert.ok(Object.keys(STACKS).length > 0);
  for (const k of Object.keys(TYPES)) assert.equal(tipoValido(k), true, `TYPES.${k} debería ser válido`);
  for (const k of Object.keys(STACKS)) assert.equal(stackValido(k), true, `STACKS.${k} debería ser válido`);
});

test('AC7: tipo/stack que no están en el catálogo son inválidos', () => {
  assert.equal(tipoValido('no-existe'), false);
  assert.equal(stackValido('no-existe'), false);
  assert.equal(tipoValido(undefined), false);
  assert.equal(tipoValido(123), false);
  assert.equal(tipoValido(''), false);
});
