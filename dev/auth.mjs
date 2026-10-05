/* El subconjunto de GoTrue (/auth/v1) que usa web/sesion.js (ADR-012).
 *
 * Las contraseñas se guardan con bcrypt de pgcrypto, como en Supabase. Los
 * mensajes de error son los de GoTrue en inglés, porque sesion.js los traduce
 * buscando esas frases: si cambian acá, la web muestra el texto crudo.
 */
import {createHmac, randomBytes, timingSafeEqual} from "node:crypto";
import {Psql} from "./postgres.mjs";

const DURACION = 3600;
const b64url = x => Buffer.from(x).toString("base64url");

export class Jwt {
  constructor(secreto){ this.secreto = secreto; }

  firmar(claims){
    const cuerpo = `${b64url(JSON.stringify({alg: "HS256", typ: "JWT"}))}.${b64url(JSON.stringify(claims))}`;
    return `${cuerpo}.${createHmac("sha256", this.secreto).update(cuerpo).digest("base64url")}`;
  }

  /* Devuelve los claims, o null si la firma no cierra o el token venció. */
  leer(token = ""){
    const partes = token.split(".");
    if (partes.length !== 3 || partes.some(x => !x)) return null;
    const [h, p, firma] = partes;
    const esperada = createHmac("sha256", this.secreto).update(`${h}.${p}`).digest();
    const dada = Buffer.from(firma, "base64url");
    if (dada.length !== esperada.length || !timingSafeEqual(dada, esperada)) return null;
    const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    return claims.exp * 1000 > Date.now() ? claims : null;
  }
}

class ErrorAuth extends Error {
  constructor(estado, mensaje){ super(mensaje); this.estado = estado; }
}

export class Auth {
  constructor(cluster){
    this.cluster = cluster;
    this.jwt = new Jwt(cluster.secreto);
  }

  async consultar(armar){
    const q = new Psql(this.cluster);
    const out = await q.correrAsync(`with r as (${armar(q)}) select coalesce(jsonb_agg(r), '[]'::jsonb) from r;`);
    return JSON.parse(out.trim().split(/\r?\n/).pop() || "[]");
  }

  async sesionPara(usuario){
    const refresh = randomBytes(24).toString("base64url");
    await this.consultar(q => `insert into auth.refresh_tokens (token, user_id)
      values (${q.valor(refresh)}, ${q.valor(usuario.id)}::uuid) returning token`);
    const ahora = Math.floor(Date.now() / 1000);
    return {
      access_token: this.jwt.firmar({sub: usuario.id, email: usuario.email, role: "authenticated",
                                     aud: "authenticated", iat: ahora, exp: ahora + DURACION}),
      token_type: "bearer",
      expires_in: DURACION,
      refresh_token: refresh,
      user: {id: usuario.id, email: usuario.email}
    };
  }

  async conPassword({email = "", password = ""}){
    const [u] = await this.consultar(q => `select id, email from auth.users
      where email = lower(${q.valor(email.trim())})
        and encrypted_password = crypt(${q.valor(password)}, encrypted_password)`);
    if (!u) throw new ErrorAuth(400, "Invalid login credentials");
    return this.sesionPara(u);
  }

  /* El refresh token es de un solo uso, como en GoTrue: se revoca al canjearlo. */
  async conRefresh({refresh_token = ""}){
    const [u] = await this.consultar(q => `update auth.refresh_tokens t set revoked = true
      from auth.users u
      where t.token = ${q.valor(refresh_token)} and not t.revoked and u.id = t.user_id
      returning u.id, u.email`);
    if (!u) throw new ErrorAuth(400, "Invalid Refresh Token: Refresh Token Not Found");
    return this.sesionPara(u);
  }

  usuarioDe(autorizacion = ""){
    const claims = this.jwt.leer(autorizacion.replace(/^Bearer\s+/i, ""));
    if (!claims) throw new ErrorAuth(401, "invalid JWT: unable to parse or verify signature, token is expired");
    return claims;
  }

  async cambiarPassword(claims, {password = ""}){
    if (password.length < 8) throw new ErrorAuth(422, "Password should be at least 8 characters.");
    await this.consultar(q => `update auth.users
      set encrypted_password = crypt(${q.valor(password)}, gen_salt('bf'))
      where id = ${q.valor(claims.sub)}::uuid returning id`);
    return {id: claims.sub, email: claims.email};
  }

  async salir(claims){
    await this.consultar(q => `update auth.refresh_tokens set revoked = true
      where user_id = ${q.valor(claims.sub)}::uuid returning token`);
  }

  /* Devuelve [estado, cuerpo]. `ruta` es lo que sigue a /auth/v1/. */
  async atender(metodo, ruta, query, headers, crudo){
    // GoTrue contesta 400 a un cuerpo raro; acá también, en vez de un 500.
    const cuerpo = Object.fromEntries(Object.entries(crudo && typeof crudo === "object" ? crudo : {})
      .map(([k, v]) => [k, typeof v === "string" ? v : ""]));
    try {
      if (metodo === "POST" && ruta === "token"){
        const tipo = query.get("grant_type");
        if (tipo === "password") return [200, await this.conPassword(cuerpo)];
        if (tipo === "refresh_token") return [200, await this.conRefresh(cuerpo)];
        throw new ErrorAuth(400, "unsupported_grant_type");
      }
      if (ruta === "user" && metodo === "GET"){
        const c = this.usuarioDe(headers.authorization);
        return [200, {id: c.sub, email: c.email, role: c.role}];
      }
      if (ruta === "user" && metodo === "PUT")
        return [200, await this.cambiarPassword(this.usuarioDe(headers.authorization), cuerpo)];
      if (ruta === "logout" && metodo === "POST"){
        await this.salir(this.usuarioDe(headers.authorization));
        return [204, null];
      }
      if (ruta === "signup") throw new ErrorAuth(422, "Signups not allowed for this instance");
      if (ruta === "recover" || ruta === "otp")
        throw new ErrorAuth(400, "En el entorno local no hay mails. Cambiá la contraseña con: node dev/dev.mjs usuario <mail> <contraseña>");
      return [404, {msg: `Ruta de auth desconocida: ${metodo} /auth/v1/${ruta}`}];
    } catch (e) {
      if (e instanceof ErrorAuth) return [e.estado, {msg: e.message, error_description: e.message}];
      throw e;
    }
  }
}

/* Para la CLI: crea la cuenta o le pisa la contraseña. Síncrono a propósito.
   `admin` en undefined deja la marca como estaba: cambiar la clave no es
   motivo para perder el panel. */
export function guardarUsuario(cluster, email, password, admin){
  const q = new Psql(cluster);
  const mail = q.valor(email.trim().toLowerCase()), pass = q.valor(password);
  q.correr(`insert into auth.users (email, encrypted_password)
    values (${mail}, crypt(${pass}, gen_salt('bf')))
    on conflict (email) do update set encrypted_password = excluded.encrypted_password;
    ${admin === undefined ? "" : `update public.perfiles p set admin = ${admin ? "true" : "false"}
    from auth.users u where u.id = p.id and u.email = ${mail};`}`);
}

export function listarUsuarios(cluster){
  const out = new Psql(cluster).correr(`select coalesce(jsonb_agg(r order by r.email), '[]'::jsonb) from (
    select u.email, coalesce(p.admin, false) as admin,
           (select count(*) from public.combinaciones c where c.usuario_id = u.id) as combinaciones
    from auth.users u left join public.perfiles p on p.id = u.id) r;`);
  return JSON.parse(out.trim() || "[]");
}
