import { test } from 'node:test';
import assert from 'node:assert/strict';
import fusionV1 from '../_lib/fusionV1.js';

const { armarConcatenacionV1 } = fusionV1;

test('AC2: la concatenación v1 es determinista y trae todos los campos del pedido', () => {
  const pedido = {
    tipo: 'webapp',
    stack: 'ts',
    tecnologias: ['React', 'Supabase'],
    playbooks: ['env-setup'],
    custom: 'PERFIL=ESTRICTO\nMODO=FULL',
    descripcion: 'Un combinador de recetas',
  };
  const a = armarConcatenacionV1(pedido);
  const b = armarConcatenacionV1(pedido);
  assert.deepEqual(a, b, 'misma entrada, mismo resultado (sin IA de por medio)');
  assert.equal(a.length, 1);
  assert.equal(a[0].nombre, 'sdd/custom.md');
  for (const x of ['webapp', 'ts', 'React', 'Supabase', 'env-setup', 'PERFIL=ESTRICTO', 'Un combinador de recetas'])
    assert.ok(a[0].contenido.includes(x), `falta "${x}" en la concatenación`);
});

test('la concatenación no rompe con campos opcionales vacíos', () => {
  const a = armarConcatenacionV1({ tipo: 'calc', stack: 'reco' });
  assert.equal(a.length, 1);
  assert.ok(a[0].contenido.includes('calc'));
});
