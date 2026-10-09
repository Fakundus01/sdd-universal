'use strict';
/* Valida tipo/stack contra el catálogo real de la web, sin duplicarlo a mano.
 * web/catalogo.js toca el DOM al cargar, así que no se puede `require`:
 * se lee como texto y se evalúan solo las constantes de datos, igual que
 * ya hace web/tests/combinador.test.mjs (misma técnica, mismo motivo). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..', '..');

let cache = null;

function datosDelCatalogo() {
  if (cache) return cache;
  const src = fs.readFileSync(path.join(RAIZ, 'web', 'catalogo.js'), 'utf8');
  const tomar = (nombre) => {
    const m = src.match(new RegExp(`const ${nombre} = ([\\[{][\\s\\S]*?\\n[\\]}]);`));
    if (!m) throw new Error(`no encontré ${nombre} en web/catalogo.js`);
    return vm.runInNewContext(`(${m[1]})`);
  };
  cache = { TYPES: tomar('TYPES'), STACKS: tomar('STACKS') };
  return cache;
}

function tipoValido(tipo) {
  return typeof tipo === 'string' && Object.prototype.hasOwnProperty.call(datosDelCatalogo().TYPES, tipo);
}

function stackValido(stack) {
  return typeof stack === 'string' && Object.prototype.hasOwnProperty.call(datosDelCatalogo().STACKS, stack);
}

function _resetCacheParaTests() {
  cache = null;
}

module.exports = { datosDelCatalogo, tipoValido, stackValido, _resetCacheParaTests };
