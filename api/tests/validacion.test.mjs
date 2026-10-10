import { test } from 'node:test';
import assert from 'node:assert/strict';
import validacionMod from '../_lib/validacion.js';
import constantesMod from '../_lib/constantes.js';

const { validarPedido } = validacionMod;
const { MAX_ARRAY_ITEMS, MAX_ITEM_CHARS, MAX_CUSTOM_BYTES } = constantesMod;

function pedidoBase(extra = {}) {
  return { tipo: 'calc', stack: 'reco', tecnologias: [], playbooks: [], custom: '', descripcion: '', ...extra };
}

test('Cambio 3: tecnologias/playbooks mal tipados dan ok:false, nunca tiran una excepción', () => {
  assert.equal(validarPedido(pedidoBase({ tecnologias: 'abc' })).ok, false);
  assert.equal(validarPedido(pedidoBase({ tecnologias: null })).ok, false);
  assert.equal(validarPedido(pedidoBase({ playbooks: 'abc' })).ok, false);
  assert.equal(validarPedido(pedidoBase({ playbooks: null })).ok, false);
  assert.equal(validarPedido(pedidoBase({ custom: 123 })).ok, false);
  assert.equal(validarPedido(pedidoBase({ custom: null })).ok, false);
});

test('Cambio 2: tecnologias/playbooks por encima de la cantidad o el largo máximo dan 400', () => {
  const muchas = Array.from({ length: MAX_ARRAY_ITEMS + 1 }, (_, i) => `t${i}`);
  assert.equal(validarPedido(pedidoBase({ tecnologias: muchas })).ok, false);

  const unaMuyLarga = ['x'.repeat(MAX_ITEM_CHARS + 1)];
  assert.equal(validarPedido(pedidoBase({ tecnologias: unaMuyLarga })).ok, false);
  assert.equal(validarPedido(pedidoBase({ playbooks: unaMuyLarga })).ok, false);

  // en el límite, pasa
  const justoAlLimite = Array.from({ length: MAX_ARRAY_ITEMS }, () => 'x'.repeat(MAX_ITEM_CHARS));
  assert.equal(validarPedido(pedidoBase({ tecnologias: justoAlLimite })).ok, true);
});

test('Cambio 2: custom por encima del máximo en bytes da 400 (no infla el costo del prompt gratis)', () => {
  const grande = 'x'.repeat(MAX_CUSTOM_BYTES + 1);
  assert.equal(validarPedido(pedidoBase({ custom: grande })).ok, false);
  assert.equal(validarPedido(pedidoBase({ custom: 'x'.repeat(MAX_CUSTOM_BYTES) })).ok, true);
});

test('tipo/stack siguen validándose contra el catálogo', () => {
  assert.equal(validarPedido(pedidoBase({ tipo: 'no-existe' })).ok, false);
  assert.equal(validarPedido(pedidoBase({ stack: 'no-existe' })).ok, false);
});

test('pedido sin tecnologias/playbooks/custom/descripcion usa los defaults y pasa', () => {
  const r = validarPedido({ tipo: 'calc', stack: 'reco' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.pedido.tecnologias, []);
  assert.deepEqual(r.pedido.playbooks, []);
  assert.equal(r.pedido.custom, '');
});

test('pedido que no es un objeto da ok:false', () => {
  assert.equal(validarPedido(null).ok, false);
  assert.equal(validarPedido('texto').ok, false);
  assert.equal(validarPedido([1, 2]).ok, false);
});
