/* El clúster de Postgres del entorno local (ADR-012).
 *
 * Usa los binarios del PATH (o de SDD_PG_BIN) y habla con la base a través de
 * psql, para no traer node_modules (ADR-001). Los valores viajan en base64
 * por stdin: nunca entran al SQL como texto y no dependen de la página de
 * códigos de la consola de Windows.
 */
import {spawn, spawnSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {randomBytes} from "node:crypto";
import {join} from "node:path";

const bin = nombre => process.env.SDD_PG_BIN ? join(process.env.SDD_PG_BIN, nombre) : nombre;

export class ErrorSql extends Error {
  constructor(codigo, mensaje){ super(mensaje); this.codigo = codigo; }
}

export class Cluster {
  constructor({datos, puerto}){
    this.datos = datos;
    this.puerto = puerto;
    this.pgdata = join(datos, "pg");
  }

  get existe(){ return existsSync(join(this.pgdata, "PG_VERSION")); }

  get secreto(){
    const archivo = join(this.datos, "jwt-secreto");
    if (!existsSync(archivo)) writeFileSync(archivo, randomBytes(32).toString("hex"));
    return readFileSync(archivo, "utf8").trim();
  }

  correr(exe, args){
    const r = spawnSync(bin(exe), args, {encoding: "utf8"});
    if (r.error) throw new Error(`No se encontró ${exe}: agregá los binarios de Postgres al PATH o definí SDD_PG_BIN. (${r.error.message})`);
    if (r.status !== 0) throw new Error(`${exe} falló:\n${r.stderr || r.stdout}`);
    return r.stdout;
  }

  crear(){
    mkdirSync(this.datos, {recursive: true});
    this.correr("initdb", ["-D", this.pgdata, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--no-locale"]);
  }

  get corriendo(){
    const r = spawnSync(bin("pg_ctl"), ["status", "-D", this.pgdata], {encoding: "utf8"});
    return r.status === 0;
  }

  arrancar(){
    if (!this.existe) this.crear();
    if (this.corriendo) return;
    // Con pipes, spawnSync espera a que se cierre el stdout que hereda el
    // postmaster, o sea nunca. Sin pipes, el error se lee del log.
    const log = join(this.datos, "postgres.log");
    const r = spawnSync(bin("pg_ctl"), ["start", "-w", "-D", this.pgdata, "-l", log,
      "-o", `-p ${this.puerto} -c listen_addresses=127.0.0.1`], {stdio: "ignore"});
    if (r.error) throw new Error(`No se encontró pg_ctl: agregá los binarios de Postgres al PATH o definí SDD_PG_BIN. (${r.error.message})`);
    if (r.status !== 0) throw new Error(`Postgres no arrancó. Mirá ${log}`);
  }

  parar(){
    if (this.existe && this.corriendo) this.correr("pg_ctl", ["stop", "-w", "-m", "fast", "-D", this.pgdata]);
  }

  /* Corre un script tal cual, como superusuario. Para los .sql del repo. */
  script(sql, base = "sdd"){
    return new Psql(this, base).correr(sql);
  }

  asegurarBase(){
    const hay = this.script("select 1 from pg_database where datname = 'sdd';", "postgres").trim();
    if (!hay) this.script("create database sdd;", "postgres");
  }
}

/* Una conexión de un solo uso. `valor(x)` devuelve la expresión SQL que trae
   x desde stdin, ya decodificada; el texto de x nunca toca el SQL. */
export class Psql {
  constructor(cluster, base = "sdd"){
    this.cluster = cluster;
    this.base = base;
    this.vars = [];
  }

  valor(x){
    const nombre = `v${this.vars.length}`;
    this.vars.push(`\\set ${nombre} '${Buffer.from(String(x), "utf8").toString("base64")}'`);
    return `convert_from(decode(:'${nombre}', 'base64'), 'UTF8')`;
  }

  args(){
    return ["-h", "127.0.0.1", "-p", String(this.cluster.puerto), "-U", "postgres", "-d", this.base,
            "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"];
  }

  entrada(sql){ return [...this.vars, sql, ""].join("\n"); }

  /* Síncrono: para el arranque y la CLI. */
  correr(sql){
    const r = spawnSync(bin("psql"), this.args(), {input: this.entrada(sql), encoding: "utf8",
                        env: {...process.env, PGCLIENTENCODING: "UTF8"}});
    if (r.error) throw r.error;
    if (r.status !== 0) throw Psql.error(r.stderr);
    return r.stdout;
  }

  /* Asíncrono: para los pedidos HTTP, que no pueden frenar al servidor. */
  correrAsync(sql){
    return new Promise((ok, mal) => {
      const p = spawn(bin("psql"), this.args(), {env: {...process.env, PGCLIENTENCODING: "UTF8"}});
      let out = "", err = "";
      p.stdout.setEncoding("utf8").on("data", d => out += d);
      p.stderr.setEncoding("utf8").on("data", d => err += d);
      p.on("error", mal);
      p.on("close", codigo => codigo === 0 ? ok(out) : mal(Psql.error(err)));
      p.stdin.end(this.entrada(sql), "utf8");
    });
  }

  /* Con VERBOSITY=verbose la línea es «ERROR:  42501: new row violates…». */
  static error(stderr = ""){
    const m = stderr.match(/ERROR:\s+([0-9A-Z]{5}):\s+(.*)/);
    return m ? new ErrorSql(m[1], m[2].trim()) : new ErrorSql("XX000", stderr.trim() || "psql falló");
  }
}

/* Una transacción con el rol y los claims del pedido, como hace PostgREST:
   así las políticas RLS se aplican en Postgres y no en este código.
   Con `devolver` en false la escritura va sin RETURNING, como el
   return=minimal de PostgREST: así un insert no necesita poder leer la fila. */
export async function comoRol(cluster, {rol, claims}, armar, devolver = true){
  const q = new Psql(cluster);
  const consulta = armar(q);
  const final = devolver ? "select coalesce(jsonb_agg(r), '[]'::jsonb) from r" : "select '[]'::jsonb";
  const sql = [
    "begin;",
    `select set_config('request.jwt.claims', ${q.valor(JSON.stringify(claims))}, true);`,
    `set local role ${rol === "authenticated" ? "authenticated" : "anon"};`,
    `with r as (${consulta}) ${final};`,
    "commit;"
  ].join("\n");
  const out = await q.correrAsync(sql);
  // la última línea es el JSON (jsonb sale en una sola línea; json_agg no);
  // la anterior es el eco de set_config
  return JSON.parse(out.trim().split(/\r?\n/).pop() || "[]");
}
