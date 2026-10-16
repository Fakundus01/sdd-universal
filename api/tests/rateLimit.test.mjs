import { test } from 'node:test';
import assert from 'node:assert/strict';
import rateLimit from '../_lib/rateLimit.js';

const { permitir, limitePorMinuto, _resetParaTests } = rateLimit;

test('AC4: una IP que pasa el límite recibe 429 con reintentar_en, otra IP no se ve afectada', () => {
  _resetParaTests();
  const limite = limitePorMinuto();
  const t0 = 1_000_000;
  let ultima;
  for (let i = 0; i < limite; i++) ultima = permitir('1.2.3.4', t0 + i);
  assert.equal(ultima.ok, true, 'hasta el límite, todo bien');

  const bloqueada = permitir('1.2.3.4', t0 + limite);
  assert.equal(bloqueada.ok, false);
  assert.ok(Number.isInteger(bloqueada.reintentar_en) && bloqueada.reintentar_en > 0);

  const otraIp = permitir('9.9.9.9', t0 + limite);
  assert.equal(otraIp.ok, true, 'otra IP no se ve afectada por el límite de la primera');
});

test('la ventana se reinicia pasado el minuto', () => {
  _resetParaTests();
  const limite = limitePorMinuto();
  const t0 = 2_000_000;
  for (let i = 0; i < limite; i++) permitir('5.5.5.5', t0);
  assert.equal(permitir('5.5.5.5', t0).ok, false);
  assert.equal(permitir('5.5.5.5', t0 + 60_000).ok, true, 'pasados 60s, cuenta de nuevo desde cero');
});
