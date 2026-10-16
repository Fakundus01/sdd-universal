// sync_conteos.mjs: corrige los conteos de la web contra scenarios.md y TECH, sin tocar el
// historial ni el fin de línea del archivo.
//   node --test "web/tests/*.test.mjs"
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {sincronizar, conteos} from "../sync_conteos.mjs";

/* Una raíz de mentira con dos situaciones, tres tecnologías y los archivos que se tocan. */
function raizFalsa(conteoEnCatalogo, {crlf = false} = {}){
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "conteos-"));
  fs.mkdirSync(path.join(raiz, "web"), {recursive: true});
  const esc = t => crlf ? t.replace(/\n/g, "\r\n") : t;
  fs.writeFileSync(path.join(raiz, "scenarios.md"), esc(
    "| # | Situación |\n|---|---|\n| S01 | una |\n| S02 | otra |\n"));
  fs.writeFileSync(path.join(raiz, "web", "tecnologias.js"),
    esc("const TECH=[{n:'a'},{n:'b'},{n:'c'}];\n"));
  fs.writeFileSync(path.join(raiz, "web", "catalogo.js"),
    esc(`{d:"La matriz de ${conteoEnCatalogo} situaciones reales"},\n`));
  fs.writeFileSync(path.join(raiz, "README.md"), esc("El catálogo trae 3 tecnologías.\n"));
  return raiz;
}

test("cuenta las filas de la matriz y el largo de TECH, no lo que diga el texto", () => {
  const raiz = raizFalsa(99);
  assert.deepEqual(conteos(raiz), {situaciones: 2, "tecnologías": 3});
});

test("sin --accept informa y no escribe nada", () => {
  const raiz = raizFalsa(99);
  const antes = fs.readFileSync(path.join(raiz, "web/catalogo.js"), "utf8");
  const {desactualizados} = sincronizar(raiz);
  assert.equal(desactualizados.length, 1);
  assert.equal(desactualizados[0].dice, "99 situaciones");
  assert.equal(desactualizados[0].esperado, "2 situaciones");
  assert.equal(fs.readFileSync(path.join(raiz, "web/catalogo.js"), "utf8"), antes);
});

test("con escribir lo corrige y la segunda corrida ya está al día", () => {
  const raiz = raizFalsa(99);
  sincronizar(raiz, {escribir: true});
  assert.match(fs.readFileSync(path.join(raiz, "web/catalogo.js"), "utf8"), /2 situaciones/);
  assert.equal(sincronizar(raiz).desactualizados.length, 0);
});

test("un conteo que ya está bien no se reescribe", () => {
  const raiz = raizFalsa(2);
  const {desactualizados, esperado} = sincronizar(raiz, {escribir: true});
  assert.equal(desactualizados.length, 0);
  assert.equal(esperado.situaciones, 2);  // y de verdad lo contó: con 0 asserts positivos, un no-op pasa
});

test("respeta el fin de línea del archivo", () => {
  const raiz = raizFalsa(99, {crlf: true});
  sincronizar(raiz, {escribir: true});
  const crudo = fs.readFileSync(path.join(raiz, "web/catalogo.js"));
  assert.match(crudo.toString("utf8"), /2 situaciones/);
  assert.equal(crudo.toString("utf8").split("\n").length - 1,
    crudo.toString("utf8").split("\r\n").length - 1, "quedó algún \\n sin su \\r");
});

test("no toca el historial: changelog y progress nombran conteos viejos a propósito", () => {
  const raiz = raizFalsa(99);
  fs.mkdirSync(path.join(raiz, "sdd"), {recursive: true});
  const viejo = "En 0.19 la web decía 40 situaciones.\n";
  fs.writeFileSync(path.join(raiz, "sdd", "changelog.md"), viejo);
  sincronizar(raiz, {escribir: true});
  assert.match(fs.readFileSync(path.join(raiz, "web/catalogo.js"), "utf8"), /2 situaciones/,
    "la corrida no hizo nada: el test del historial pasaría igual");
  assert.equal(fs.readFileSync(path.join(raiz, "sdd/changelog.md"), "utf8"), viejo);
});
