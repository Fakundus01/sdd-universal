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

test('AC8/Cambio 6: logSeguro() nunca imprime el mensaje del error, solo el tipo y el status', () => {
  const clave = 'sk-ant-secreta-123';
  // Como las clases reales del SDK (BadRequestError extends APIError extends
  // AnthropicError extends Error): `.name` queda heredado como "Error", la
  // señal real es `constructor.name`.
  class AuthenticationError extends Error {
    constructor(mensaje, status) {
      super(mensaje);
      this.status = status;
    }
  }
  const error = new AuthenticationError(`401 unauthorized: invalid x-api-key ${clave}`, 401);
  const lineas = [];
  const originalError = console.error;
  console.error = (...args) => lineas.push(args.join(' '));
  try {
    logSeguro('fusionar', error);
  } finally {
    console.error = originalError;
  }
  const salida = lineas.join('\n');
  assert.ok(!salida.includes(clave), `la clave quedó en el log: ${salida}`);
  assert.ok(!salida.includes('401 unauthorized'), `el TEXTO del error no tiene que loguearse (playbook §B paso 9): ${salida}`);
  assert.ok(salida.includes('AuthenticationError'), 'el tipo (constructor.name) tiene que loguearse');
  assert.ok(salida.includes('status=401'), 'el status HTTP, si existe, se suma al log');
});

test('V2-3: logSeguro() suma error.code cuando existe (dato del sistema, no del usuario)', () => {
  // Ej: ENOENT si falta web/catalogo.js en el bundle de Vercel (review vuelta 2,
  // sonda "catalogo ausente en el bundle") — hoy el log decía solo "Error",
  // sin ninguna pista de la causa real.
  const error = new Error('ENOENT: no such file or directory, open \'web/catalogo.js\'');
  error.code = 'ENOENT';
  const lineas = [];
  const originalError = console.error;
  console.error = (...args) => lineas.push(args.join(' '));
  try {
    logSeguro('fusionar', error);
  } finally {
    console.error = originalError;
  }
  const salida = lineas.join('\n');
  assert.ok(salida.includes('code=ENOENT'), `el log tiene que incluir error.code: ${salida}`);
  assert.ok(!salida.includes('no such file or directory'), 'el mensaje sigue sin loguearse, solo el code');
});

test('logSeguro() con un error sin status ni constructor con nombre propio no revienta', () => {
  const lineas = [];
  const originalError = console.error;
  console.error = (...args) => lineas.push(args.join(' '));
  try {
    logSeguro('fusionar', new Error('algo pasó'));
    logSeguro('fusionar', 'no es un Error');
  } finally {
    console.error = originalError;
  }
  assert.equal(lineas.length, 2);
});

test('tachar() no revienta sin clave configurada', () => {
  assert.equal(tachar('hola', ''), 'hola');
  assert.equal(tachar('hola', undefined), 'hola');
});
