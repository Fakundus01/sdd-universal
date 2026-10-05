/* El subconjunto de PostgREST (/rest/v1) que usa web/sesion.js (ADR-012).
 *
 * Traduce, no decide: arma el mismo SQL que armaría PostgREST y lo corre con
 * el rol y los claims del pedido. Si este archivo filtrara filas por su
 * cuenta, el test de RLS estaría probando al emulador y no a las políticas.
 */
import {comoRol, ErrorSql} from "./postgres.mjs";

const RECURSOS = new Set(["perfiles", "combinaciones", "eventos", "metricas_resumen", "metricas_por_dia"]);
const RESERVADOS = new Set(["select", "order", "on_conflict", "limit"]);
const OPERADORES = {eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<="};

class ErrorRest extends Error {
  constructor(estado, codigo, mensaje){ super(mensaje); this.estado = estado; this.codigo = codigo; }
}

const ident = x => {
  if (!/^[a-z_][a-z0-9_]*$/.test(x)) throw new ErrorRest(400, "PGRST100", `Nombre inválido: ${x}`);
  return `"${x}"`;
};

export class Rest {
  constructor(cluster, jwt){
    this.cluster = cluster;
    this.jwt = jwt;
  }

  /* Sin Authorization es anon, como la clave pública. Con un token que no
     verifica es 401: PostgREST no degrada a anon un JWT inválido. */
  rolDe(autorizacion){
    if (!autorizacion) return {rol: "anon", claims: {role: "anon"}};
    const claims = this.jwt.leer(autorizacion.replace(/^Bearer\s+/i, ""));
    if (!claims) throw new ErrorRest(401, "PGRST301", "JWT expired");
    return {rol: "authenticated", claims};
  }

  /* El valor se convierte al tipo de la columna pasando por el tipo de la
     tabla: así `id=eq.<uuid>` compara uuid con uuid sin conocer el esquema. */
  donde(q, tabla, query){
    const condiciones = [];
    for (const [col, crudo] of query){
      if (RESERVADOS.has(col)) continue;
      const m = crudo.match(/^(eq|neq|gt|gte|lt|lte)\.([\s\S]*)$/);
      if (!m) throw new ErrorRest(400, "PGRST100", `Filtro no soportado en local: ${col}=${crudo}`);
      const c = ident(col);
      condiciones.push(`${c} ${OPERADORES[m[1]]} (json_populate_record(null::public.${tabla}, ` +
                       `json_build_object('${col}', ${q.valor(m[2])}))).${c}`);
    }
    return condiciones.length ? ` where ${condiciones.join(" and ")}` : "";
  }

  columnas(query){
    const sel = query.get("select") || "*";
    return sel === "*" ? "*" : sel.split(",").map(ident).join(", ");
  }

  orden(query){
    const o = query.get("order");
    if (!o) return "";
    return " order by " + o.split(",").map(parte => {
      const [col, dir = "asc", nulos] = parte.split(".");
      if (!["asc", "desc"].includes(dir)) throw new ErrorRest(400, "PGRST100", `Orden inválido: ${parte}`);
      return `${ident(col)} ${dir}${nulos === "nullslast" ? " nulls last" : nulos === "nullsfirst" ? " nulls first" : ""}`;
    }).join(", ");
  }

  limite(query){
    const l = query.get("limit");
    return l && /^\d+$/.test(l) ? ` limit ${l}` : "";
  }

  insertar(q, tabla, query, cuerpo, prefer, devolver){
    const filas = Array.isArray(cuerpo) ? cuerpo : [cuerpo];
    const claves = [...new Set(filas.flatMap(f => Object.keys(f || {})))];
    if (!claves.length) throw new ErrorRest(400, "PGRST102", "Cuerpo vacío");
    const cols = claves.map(ident).join(", ");
    let sql = `insert into public.${tabla} (${cols}) select ${cols} ` +
              `from json_populate_recordset(null::public.${tabla}, (${q.valor(JSON.stringify(filas))})::json)`;
    if (/resolution=(merge|ignore)-duplicates/.test(prefer)){
      const conflicto = (query.get("on_conflict") || "id").split(",").map(ident);
      const pisar = claves.map(ident).filter(c => !conflicto.includes(c));
      sql += ` on conflict (${conflicto.join(", ")}) ` + (prefer.includes("merge-duplicates") && pisar.length
        ? `do update set ${pisar.map(c => `${c} = excluded.${c}`).join(", ")}` : "do nothing");
    }
    return sql + (devolver ? " returning *" : "");
  }

  actualizar(q, tabla, query, cuerpo, devolver){
    const claves = Object.keys(cuerpo || {});
    if (!claves.length) throw new ErrorRest(400, "PGRST102", "Cuerpo vacío");
    const cols = claves.map(ident).join(", ");
    return `update public.${tabla} set (${cols}) = (select ${cols} ` +
           `from json_populate_record(null::public.${tabla}, (${q.valor(JSON.stringify(cuerpo))})::json))` +
           this.donde(q, tabla, query) + (devolver ? " returning *" : "");
  }

  /* 42501 es «RLS no te deja»: 403 con sesión, 401 sin ella, como PostgREST. */
  static estadoDe(e, rol){
    if (e.codigo === "42501") return rol === "anon" ? 401 : 403;
    if (["23505", "23503"].includes(e.codigo)) return 409;
    return /^(22|23|42)/.test(e.codigo) ? 400 : 500;
  }

  /* Devuelve [estado, cuerpo]. `recurso` es lo que sigue a /rest/v1/. */
  async atender(metodo, recurso, query, headers, cuerpo){
    let rol = "anon";
    try {
      if (!RECURSOS.has(recurso))
        throw new ErrorRest(404, "PGRST205", `Could not find the table 'public.${recurso}' in the schema cache`);
      const quien = this.rolDe(headers.authorization);
      rol = quien.rol;
      const tabla = ident(recurso);
      const prefer = headers.prefer || "";
      const devolver = metodo === "GET" || prefer.includes("return=representation");

      const armar = {
        GET:    q => `select ${this.columnas(query)} from public.${tabla}${this.donde(q, tabla, query)}` +
                     `${this.orden(query)}${this.limite(query)}`,
        POST:   q => this.insertar(q, tabla, query, cuerpo, prefer, devolver),
        PATCH:  q => this.actualizar(q, tabla, query, cuerpo, devolver),
        DELETE: q => `delete from public.${tabla}${this.donde(q, tabla, query)}${devolver ? " returning *" : ""}`
      }[metodo];
      if (!armar) throw new ErrorRest(405, "PGRST117", `Método no soportado: ${metodo}`);

      const filas = await comoRol(this.cluster, quien, armar, devolver);
      if (metodo === "GET") return [200, filas];
      if (!devolver) return [metodo === "POST" ? 201 : 204, null];
      return [metodo === "POST" ? 201 : 200, filas];
    } catch (e) {
      if (e instanceof ErrorRest) return [e.estado, {code: e.codigo, message: e.message}];
      if (e instanceof ErrorSql) return [Rest.estadoDe(e, rol), {code: e.codigo, message: e.message}];
      throw e;
    }
  }
}
