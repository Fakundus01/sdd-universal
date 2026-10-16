// Corre las pruebas de `api/` solo si están sus dependencias instaladas (ADR-018).
//
// El SDK de Anthropic es dependencia **real** del endpoint, no una comodidad de desarrollo: las
// pruebas corren contra el SDK con un transporte simulado, nunca contra un mock del cliente escrito
// a mano (`playbooks/ia-en-el-producto.md` §E). Sin `npm ci` no hay nada que correr.
//
// Y un clon limpio del paquete tiene que poder verificarse sin instalar nada: el núcleo del SDD son
// MD que alguien baja para leer, no un proyecto Node. Un rojo por una dependencia que falta es el
// mismo falso rojo que el arnés viene sacando (S46, harness_fixes de main), y se paga igual: se
// aprende a ignorar el rojo.
//
// Por eso acá se saltea con aviso, igual que `lint` ausente da WARN y no FAIL. Donde sí hay
// dependencias —tu máquina y CI— corre completo y cualquier falla es un FAIL de verdad.
import {existsSync} from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SDK = path.join(RAIZ, "node_modules", "@anthropic-ai", "sdk");

if (!existsSync(SDK)){
  console.log("[api] salteado: no está node_modules/@anthropic-ai/sdk. Para correrlas: npm ci (ADR-018)");
  process.exit(0);
}

const r = spawnSync(process.execPath, ["--test", "api/tests/*.test.mjs"], {cwd: RAIZ, stdio: "inherit"});
process.exit(r.status ?? 1);
