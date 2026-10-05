#!/usr/bin/env node
/* Entorno local del SDD Hub (ADR-012). Uso:
 *
 *   node dev/dev.mjs                         arranca todo en http://127.0.0.1:4321
 *   node dev/dev.mjs usuarios                lista las cuentas
 *   node dev/dev.mjs usuario <mail> <clave> [--admin|--no-admin]   crea o le cambia la clave
 *   node dev/dev.mjs parar                   para el Postgres si quedó corriendo
 *   node dev/dev.mjs reset                   borra la base local entera
 *
 * Puertos: SDD_PUERTO (4321) y SDD_PUERTO_PG (54329).
 */
import {rmSync} from "node:fs";
import {join} from "node:path";
import {Cluster} from "./postgres.mjs";
import {guardarUsuario, listarUsuarios} from "./auth.mjs";
import {levantar, prepararBase, RAIZ} from "./servidor.mjs";

const DATOS = join(RAIZ, "dev", ".data");
const PUERTO = Number(process.env.SDD_PUERTO || 4321);
const PUERTO_PG = Number(process.env.SDD_PUERTO_PG || 54329);

// Solo existen en dev/.data, que no se commitea (security.md §3b).
const CUENTAS_DE_EJEMPLO = [
  ["facundo@sdd.local", "facundo-local", true],
  ["ana@sdd.local", "ana-local", false],
  ["beto@sdd.local", "beto-local", false]
];

function mostrarCuentas(cluster){
  const cuentas = listarUsuarios(cluster);
  const claves = Object.fromEntries(CUENTAS_DE_EJEMPLO.map(([m, c]) => [m, c]));
  console.log("\nCuentas locales:");
  for (const c of cuentas)
    console.log(`  ${c.email.padEnd(22)} ${(claves[c.email] || "(la que le pusiste)").padEnd(20)}` +
                `${c.admin ? "admin  " : "       "}${c.combinaciones} combinaciones`);
}

function clusterPreparado(){
  const cluster = new Cluster({datos: DATOS, puerto: PUERTO_PG});
  cluster.arrancar();
  prepararBase(cluster);
  return cluster;
}

async function arrancar(){
  const entorno = await levantar({datos: DATOS, puerto: PUERTO, puertoPg: PUERTO_PG});
  if (!listarUsuarios(entorno.cluster).length)
    for (const [mail, clave, admin] of CUENTAS_DE_EJEMPLO) guardarUsuario(entorno.cluster, mail, clave, admin);
  mostrarCuentas(entorno.cluster);
  console.log(`\nSDD Hub local en ${entorno.url}/web/  (Postgres en 127.0.0.1:${PUERTO_PG})`);
  console.log("Ctrl+C para cortar: para el servidor y el Postgres.\n");

  let cerrando = false;
  const cortar = async () => {
    if (cerrando) return;
    cerrando = true;
    await entorno.cerrar();
    process.exit(0);
  };
  process.on("SIGINT", cortar);
  process.on("SIGTERM", cortar);
}

const [comando = "arrancar", ...args] = process.argv.slice(2);
const acciones = {
  arrancar,
  usuarios: () => mostrarCuentas(clusterPreparado()),
  usuario: () => {
    const [mail, clave] = args.filter(a => !a.startsWith("--"));
    if (!mail || !clave || clave.length < 8)
      throw new Error("Uso: node dev/dev.mjs usuario <mail> <clave de 8 o más> [--admin|--no-admin]");
    const cluster = clusterPreparado();
    const admin = args.includes("--admin") ? true : args.includes("--no-admin") ? false : undefined;
    guardarUsuario(cluster, mail, clave, admin);
    mostrarCuentas(cluster);
  },
  parar: () => new Cluster({datos: DATOS, puerto: PUERTO_PG}).parar(),
  reset: () => {
    new Cluster({datos: DATOS, puerto: PUERTO_PG}).parar();
    rmSync(DATOS, {recursive: true, force: true});
    console.log("Base local borrada. La próxima vez que arranques se crea de cero.");
  }
};

try {
  if (!acciones[comando]) throw new Error(`Comando desconocido: ${comando}. Mirá el encabezado de dev/dev.mjs.`);
  await acciones[comando]();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
