// C-11: unitarios de Paquete.reescribirLinks(texto, origen, destino, mapa) y
// del visor (Md.render) con links anidados en corchetes.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const leer = r => fs.readFileSync(path.join(RAIZ, r), "utf8");
const ctx = {TextEncoder, Uint8Array, Uint32Array, DataView, Blob, Date, Set, Map, Math, Error};
vm.createContext(ctx);
vm.runInContext(leer("web/zip.js") + "\n" + leer("web/paquete.js") + "\n" + leer("web/md.js") +
                "\n;this.Paquete = Paquete; this.Md = Md;", ctx);
const {Paquete, Md} = ctx;

// paquete: SDD-MASTER.md, agents/leader.md, harness.md  ->  ZIP: sdd/…, agents/…
const MAPA = new Map([
  ["SDD-MASTER.md", "p/sdd/SDD-MASTER.md"],
  ["harness.md", "p/sdd/harness.md"],
  ["agents/leader.md", "p/agents/leader.md"],
  ["prompts/task-card.md", "p/sdd/prompts/task-card.md"]
]);
const rw = (txt, origen = "SDD-MASTER.md") => Paquete.reescribirLinks(txt, origen, MAPA.get(origen), MAPA);

test("destino incluido en otra carpeta: se reescribe a la ruta relativa dentro del ZIP", () => {
  assert.equal(rw("ver [leader](agents/leader.md)"), "ver [leader](../agents/leader.md)");
  assert.equal(rw("ver [h](../harness.md)", "agents/leader.md"), "ver [h](../sdd/harness.md)");
  assert.equal(rw("[t](prompts/task-card.md)"), "[t](prompts/task-card.md)");
});

test("destino excluido: queda el texto, sin link", () => {
  assert.equal(rw("ver [escenarios](scenarios.md) y [x](../../fuera.md)."), "ver escenarios y x.");
});

test("ancla: se conserva en el destino reescrito y en el texto no queda rastro si se excluye", () => {
  assert.equal(rw("[l](agents/leader.md#limites)"), "[l](../agents/leader.md#limites)");
  assert.equal(rw("[s](scenarios.md#s1)"), "s");
});

test("externos, anclas puras y otros tipos de archivo no se tocan", () => {
  const t = "[a](https://x.dev/y.md) [b](#sec) [c](mailto:a@b.c) [d](harness/verify.py) [e](agents/)";
  assert.equal(rw(t), t);
});

test("bloques de código y code spans no se tocan", () => {
  const t = "```md\n[x](scenarios.md)\n```\n  ```\n[y](scenarios.md)\n  ```\ny `[z](scenarios.md)` y [w](scenarios.md)";
  assert.equal(rw(t), "```md\n[x](scenarios.md)\n```\n  ```\n[y](scenarios.md)\n  ```\ny `[z](scenarios.md)` y w");
});

test("texto con corchetes y code spans: el texto se conserva entero", () => {
  assert.equal(rw("[ver [1] `a.md`](scenarios.md)"), "ver [1] `a.md`");
  assert.equal(rw("[ver [1]](agents/leader.md)"), "[ver [1]](../agents/leader.md)");
  assert.equal(rw("[ninguna / ej.: R01=OFF — ver [`custom.md`](custom.md)]"),
               "[ninguna / ej.: R01=OFF — ver `custom.md`]");
});

test("enlazar: reescribe solo los MD con origen y respeta el resto", () => {
  const as = [
    {nombre: "p/sdd/SDD-MASTER.md", origen: "SDD-MASTER.md", contenido: "[h](harness.md) [l](agents/leader.md) [s](scenarios.md)"},
    {nombre: "p/sdd/harness.md", origen: "harness.md", contenido: ""},
    {nombre: "p/agents/leader.md", origen: "agents/leader.md", contenido: ""},
    {nombre: "p/LEEME.md", contenido: "[s](scenarios.md)"},
    {nombre: "p/PROMPT.txt", origen: "x.txt", contenido: "[s](scenarios.md)"}
  ];
  const out = Paquete.enlazar(as);
  assert.equal(out[0].contenido, "[h](harness.md) [l](../agents/leader.md) s");
  assert.equal(out[3].contenido, "[s](scenarios.md)");
  assert.equal(out[4].contenido, "[s](scenarios.md)");
});

test("visor: un link dentro de un [ … ] de plantilla no deja un [ suelto", () => {
  const html = Md.render("- **Reglas:** [ninguna / lista, ej.: R01=OFF — ver [`custom.md`](custom.md)]");
  assert.match(html, /\[ninguna \/ lista, ej\.: R01=OFF — ver <a href="custom\.md"><code>custom\.md<\/code><\/a>\]/);
  assert.ok(!/<a href="custom\.md">[^<]*\[/.test(html), "el link se comió el [");
});
