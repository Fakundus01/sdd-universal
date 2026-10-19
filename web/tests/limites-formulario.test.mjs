// Que los límites del formulario de la web sean los mismos que valida la API.
//
// Nace del cierre de F28: el textarea `#cdesc` no declaraba `maxlength`, así que una descripción más
// larga que `MAX_DESCRIPCION_CHARS` se podía escribir, viajaba al endpoint, volvía `400` y la
// interfaz lo mostraba como el aviso genérico de «la fusión no salió, bajás la v1». El usuario no se
// enteraba de que el problema era el largo, y lo único que había que hacer era no dejarlo escribir.
//
// Es el mismo patrón que `metricas-formato.test.mjs`: un límite escrito dos veces, en dos lenguajes,
// y nada que los cruce. El valor del HTML no se puede importar, así que se lee como texto.
//   node --test "web/tests/*.test.mjs"
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const leer = r => fs.readFileSync(path.join(RAIZ, r), "utf8").replace(/\r\n/g, "\n");

/** Una constante numérica de `api/_lib/constantes.js`, leída como texto: es CommonJS y este test no
 * tiene por qué cargar el módulo del endpoint para comparar un número. */
function constanteDeLaApi(nombre){
  const m = leer("api/_lib/constantes.js").match(new RegExp(`${nombre}:\\s*(\\d+)`));
  assert.ok(m, `api/_lib/constantes.js no define ${nombre}`);
  return Number(m[1]);
}

/** Los atributos de la etiqueta que abre el `textarea`/`input` con ese id, en `web/index.html`. */
function atributosDe(id){
  const m = leer("web/index.html").match(new RegExp(`<(?:textarea|input)([^>]*\\bid="${id}"[^>]*)>`));
  assert.ok(m, `web/index.html no tiene un textarea ni un input con id="${id}"`);
  return m[1];
}

test("el textarea #cdesc no deja escribir más de lo que la API acepta", () => {
  const max = constanteDeLaApi("MAX_DESCRIPCION_CHARS");
  const m = atributosDe("cdesc").match(/maxlength="(\d+)"/);
  assert.ok(m, "el textarea #cdesc no declara maxlength: una descripción más larga que el máximo de "
    + "la API viaja igual, vuelve 400 y el usuario solo ve el aviso genérico del fallback v1");
  assert.equal(Number(m[1]), max,
    `#cdesc deja escribir ${m[1]} caracteres y la API corta en ${max}: el que sobre se pierde en un 400`);
});
