import { test } from 'node:test';
import assert from 'node:assert/strict';
import costo from '../_lib/costo.js';

const { estimarCotaUSD, costoRealUSD, usdAMicros, bytesUtf8 } = costo;

test('playbook §A paso 2: la cota crece con el tamaño del prompt (no es un número fijo)', () => {
  const chica = estimarCotaUSD({ promptBytes: bytesUtf8('hola'), maxTokensSalida: 100 });
  const grande = estimarCotaUSD({ promptBytes: bytesUtf8('hola '.repeat(5000)), maxTokensSalida: 100 });
  assert.ok(grande > chica, 'un historial/prompt más largo tiene que reservar más');
});

test('la cota nunca es cero ni negativa', () => {
  const cota = estimarCotaUSD({ promptBytes: 0, maxTokensSalida: 0 });
  assert.ok(cota > 0, 'el margen del proveedor solo ya pesa algo');
});

test('usdAMicros redondea siempre para arriba: la cota nunca se subestima', () => {
  assert.equal(usdAMicros(0.0000001), 1n);
  assert.equal(usdAMicros(1), 1_000_000n);
});

test('costoRealUSD con usage vacío/parcial no revienta y da 0', () => {
  assert.equal(costoRealUSD(undefined), 0);
  assert.equal(costoRealUSD({}), 0);
  assert.ok(costoRealUSD({ input_tokens: 1000, output_tokens: 500 }) > 0);
});
