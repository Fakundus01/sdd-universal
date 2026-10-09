import { test } from 'node:test';
import assert from 'node:assert/strict';
import secreto from '../_lib/secreto.js';

const { tachar, logSeguro } = secreto;

test('AC8: tachar() saca la clave de un texto que la repite', () => {
  const clave = 'sk-ant-secreta-123';
  const texto = `Error: la clave ${clave} no es válida`;
  const limpio = tachar(texto, clave);
  assert.ok(!limpio.includes(clave));
  assert.ok(limpio.includes('[REDACTED]'));
});

test('AC8: logSeguro() nunca imprime la clave, ni en el mensaje del error', () => {
  const clave = 'sk-ant-secreta-123';
  const error = new Error(`401 unauthorized: invalid x-api-key ${clave}`);
  error.name = 'AuthenticationError';
  const lineas = [];
  const originalError = console.error;
  console.error = (...args) => lineas.push(args.join(' '));
  try {
    logSeguro('fusionar', error, clave);
  } finally {
    console.error = originalError;
  }
  const salida = lineas.join('\n');
  assert.ok(!salida.includes(clave), `la clave quedó en el log: ${salida}`);
  assert.ok(salida.includes('AuthenticationError'), 'el tipo del error tiene que loguearse');
});

test('tachar() no revienta sin clave configurada', () => {
  assert.equal(tachar('hola', ''), 'hola');
  assert.equal(tachar('hola', undefined), 'hola');
});
