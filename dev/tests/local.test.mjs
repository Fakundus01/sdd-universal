/* El entorno local de punta a punta, y con él la prueba de las dos cuentas de
 * F5: un clúster temporal con supabase/schema.sql y metricas.sql tal cual, y
 * pedidos HTTP como los hace web/sesion.js.
 *
 *   node --test "dev/tests/*.test.mjs"
 */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {request} from "node:http";
import {levantar} from "../servidor.mjs";
import {guardarUsuario} from "../auth.mjs";

let entorno, datos, A, B, ADMIN;

async function pedir(ruta, {metodo = "GET", token, cuerpo, headers = {}} = {}){
  const r = await fetch(entorno.url + ruta, {
    method: metodo,
    headers: {apikey: "local-anon", "Content-Type": "application/json",
              ...(token ? {Authorization: `Bearer ${token}`} : {}), ...headers},
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });
  const texto = await r.text();
  return {estado: r.status, datos: texto ? JSON.parse(texto) : null, headers: r.headers};
}

const entrar = async (email, password) =>
  (await pedir("/auth/v1/token?grant_type=password", {metodo: "POST", cuerpo: {email, password}})).datos;

// El mismo pedido que hace Sesion.guardarCombinacion, con la ruta leída de
// sesion.js: si la web cambia el on_conflict, el test prueba el nuevo.
const SESION = readFileSync(new URL("../../web/sesion.js", import.meta.url), "utf8");
const RUTA_GUARDAR = SESION.match(/rest\("(combinaciones\?on_conflict=[a-z_,]+)"/)[1];
const guardar = (sesion, c) => pedir(`/rest/v1/${RUTA_GUARDAR}`, {
  metodo: "POST", token: sesion.access_token,
  headers: {Prefer: "resolution=merge-duplicates,return=representation"},
  cuerpo: {tipo: "webapp", stack: "reco", playbooks: [], tecnologias: ["Node.js"], ...c, usuario_id: sesion.user.id}
});

const listar = sesion => pedir("/rest/v1/combinaciones?select=*&order=actualizado_en.desc", {token: sesion?.access_token});

before(async () => {
  datos = mkdtempSync(join(tmpdir(), "sdd-dev-test-"));
  entorno = await levantar({datos, puerto: 0, puertoPg: 54339});
  guardarUsuario(entorno.cluster, "a@test.local", "clave-de-a-123");
  guardarUsuario(entorno.cluster, "b@test.local", "clave-de-b-123");
  guardarUsuario(entorno.cluster, "admin@test.local", "clave-admin-123", true);
  [A, B, ADMIN] = await Promise.all([entrar("a@test.local", "clave-de-a-123"),
    entrar("b@test.local", "clave-de-b-123"), entrar("admin@test.local", "clave-admin-123")]);
});

after(async () => {
  await entorno?.cerrar();
  rmSync(datos, {recursive: true, force: true});
});

test("una cuenta no ve, ni edita, ni borra las combinaciones de otra", async () => {
  const creada = await guardar(A, {nombre: "Tienda de A"});
  assert.equal(creada.estado, 201, JSON.stringify(creada.datos));
  const id = creada.datos[0].id;

  assert.equal((await listar(A)).datos.length, 1);
  assert.deepEqual((await listar(B)).datos, [], "B ve combinaciones de A");
  assert.deepEqual((await pedir(`/rest/v1/combinaciones?id=eq.${id}`, {token: B.access_token})).datos, []);

  await pedir(`/rest/v1/combinaciones?id=eq.${id}`, {metodo: "PATCH", token: B.access_token, cuerpo: {nombre: "pisada por B"}});
  await pedir(`/rest/v1/combinaciones?id=eq.${id}`, {metodo: "DELETE", token: B.access_token});
  const deA = (await listar(A)).datos;
  assert.equal(deA.length, 1, "B borró la combinación de A");
  assert.equal(deA[0].nombre, "Tienda de A", "B editó la combinación de A");
});

test("no se puede crear una combinación a nombre de otra cuenta", async () => {
  // return=minimal: sin RETURNING, lo único que frena es el `with check` de
  // «crear». Con representation también frenaría la política de lectura, y el
  // test seguiría verde con el `with check` roto (lo encontró el reviewer).
  const r = await pedir("/rest/v1/combinaciones", {
    metodo: "POST", token: B.access_token, headers: {Prefer: "return=minimal"},
    cuerpo: {nombre: "colada", tipo: "webapp", usuario_id: A.user.id}
  });
  assert.equal(r.estado, 403);
  assert.equal(r.datos.code, "42501");
  assert.ok(!(await listar(A)).datos.some(c => c.nombre === "colada"));
});

test("un perfil solo lo lee y lo edita su dueño", async () => {
  const propio = await pedir(`/rest/v1/perfiles?id=eq.${A.user.id}&select=*`, {token: A.access_token});
  assert.equal(propio.datos[0]?.email, "a@test.local", "el trigger no creó el perfil");

  assert.deepEqual((await pedir(`/rest/v1/perfiles?id=eq.${A.user.id}&select=*`, {token: B.access_token})).datos, []);
  const patch = await pedir(`/rest/v1/perfiles?id=eq.${A.user.id}`, {metodo: "PATCH", token: B.access_token, cuerpo: {tema: "light"}});
  assert.equal(patch.estado, 204);
  const despues = (await pedir(`/rest/v1/perfiles?id=eq.${A.user.id}&select=*`, {token: A.access_token})).datos[0];
  assert.equal(despues.tema, "dark");
  assert.equal(despues.admin, false);
});

test("nadie se vuelve admin desde la aplicación, ni con su propio perfil", async () => {
  const intento = await pedir(`/rest/v1/perfiles?id=eq.${A.user.id}`, {metodo: "PATCH", token: A.access_token, cuerpo: {admin: true}});
  assert.equal(intento.estado, 403, JSON.stringify(intento.datos));
  const perfil = (await pedir(`/rest/v1/perfiles?id=eq.${A.user.id}&select=*`, {token: A.access_token})).datos[0];
  assert.equal(perfil.admin, false, "A se dio admin a sí misma");
  assert.deepEqual((await pedir("/rest/v1/metricas_resumen?select=*", {token: A.access_token})).datos, []);

  const tema = await pedir(`/rest/v1/perfiles?id=eq.${A.user.id}`, {metodo: "PATCH", token: A.access_token, cuerpo: {tema: "light"}});
  assert.equal(tema.estado, 204, "el arreglo rompió guardarTema");

  // Las claves que manda guardarPerfil, leídas de sesion.js: si la web suma
  // una columna y el grant de metricas.sql no, el PATCH entero falla en silencio.
  const claves = SESION.match(/async function guardarPerfil\(\{([^}]+)\}/)[1].split(",").map(c => c.trim());
  const todas = Object.fromEntries(claves.map(c => [c, c === "onboarding" ? true : c === "nivel" ? "NOVATO" : c === "perfil_sdd" ? "CONFIANZA" : "x"]));
  const r = await pedir(`/rest/v1/perfiles?id=eq.${A.user.id}`, {metodo: "PATCH", token: A.access_token, cuerpo: todas});
  assert.equal(r.estado, 204, `guardarPerfil no puede escribir: ${JSON.stringify(r.datos)}`);
  assert.equal((await pedir(`/rest/v1/perfiles?id=eq.${A.user.id}&select=*`, {token: A.access_token})).datos[0].onboarding, true);
});

test("cambiar la clave desde la CLI no le saca el admin a nadie", async () => {
  guardarUsuario(entorno.cluster, "admin@test.local", "otra-clave-admin-1");
  const s = await entrar("admin@test.local", "otra-clave-admin-1");
  assert.equal((await pedir(`/rest/v1/perfiles?id=eq.${s.user.id}&select=admin`, {token: s.access_token})).datos[0].admin, true);
});

test("sin sesión no se lee nada, y un token falso no pasa como anon", async () => {
  await guardar(A, {nombre: "otra de A"});
  assert.deepEqual((await listar(null)).datos, []);
  assert.deepEqual((await pedir("/rest/v1/perfiles?select=*")).datos, []);
  const falso = await pedir("/rest/v1/combinaciones?select=*", {token: A.access_token.slice(0, -4) + "AAAA"});
  assert.equal(falso.estado, 401);
});

test("las métricas se suman sin sesión y solo las lee el admin", async () => {
  const suma = await pedir("/rest/v1/eventos", {metodo: "POST", headers: {Prefer: "return=minimal"},
                                                cuerpo: {tipo: "descarga", detalle: "SDD-MASTER.md"}});
  assert.equal(suma.estado, 201, JSON.stringify(suma.datos));
  assert.deepEqual((await pedir("/rest/v1/eventos?select=*")).datos, []);
  assert.deepEqual((await pedir("/rest/v1/metricas_resumen?select=*", {token: B.access_token})).datos, []);
  const deAdmin = (await pedir("/rest/v1/metricas_resumen?select=*&order=total.desc", {token: ADMIN.access_token})).datos;
  assert.equal(deAdmin.find(m => m.detalle === "SDD-MASTER.md")?.total, 1);
});

test("guardar dos veces el mismo nombre pisa la combinación, no la duplica", async () => {
  const primera = await guardar(B, {nombre: "Landing", stack: "reco"});
  assert.equal(primera.estado, 201, JSON.stringify(primera.datos));
  // Con otra mayúscula, como el guardado sin cuenta: es el mismo nombre.
  const segunda = await guardar(B, {nombre: "landing", stack: "html"});
  assert.equal(segunda.estado, 201, JSON.stringify(segunda.datos));
  const deB = (await listar(B)).datos.filter(c => c.nombre.toLowerCase() === "landing");
  assert.equal(deB.length, 1);
  assert.equal(deB[0].stack, "html");
});

test("login, usuario, refresh de un solo uso, cambio de clave, logout y registro cerrado", async () => {
  const mal = await pedir("/auth/v1/token?grant_type=password", {metodo: "POST", cuerpo: {email: "a@test.local", password: "otra"}});
  assert.equal(mal.estado, 400);
  assert.match(mal.datos.error_description, /invalid login credentials/i);

  const s = await entrar("b@test.local", "clave-de-b-123");
  assert.equal((await pedir("/auth/v1/user", {token: s.access_token})).datos.email, "b@test.local");

  const canje = () => pedir("/auth/v1/token?grant_type=refresh_token", {metodo: "POST", cuerpo: {refresh_token: s.refresh_token}});
  assert.equal((await canje()).estado, 200);
  assert.equal((await canje()).estado, 400, "el refresh token se pudo usar dos veces");

  const corta = await pedir("/auth/v1/user", {metodo: "PUT", token: s.access_token, cuerpo: {password: "corta"}});
  assert.equal(corta.estado, 422);
  assert.equal((await pedir("/auth/v1/user", {metodo: "PUT", token: s.access_token, cuerpo: {password: "nueva-de-b-123"}})).estado, 200);
  assert.ok((await entrar("b@test.local", "nueva-de-b-123")).access_token);

  const otra = await entrar("b@test.local", "nueva-de-b-123");
  assert.equal((await pedir("/auth/v1/logout", {metodo: "POST", token: otra.access_token})).estado, 204);
  const tras = await pedir("/auth/v1/token?grant_type=refresh_token", {metodo: "POST", cuerpo: {refresh_token: otra.refresh_token}});
  assert.equal(tras.estado, 400, "el logout no revocó el refresh token");

  const alta = await pedir("/auth/v1/signup", {metodo: "POST", cuerpo: {email: "x@test.local", password: "clave-x-1234"}});
  assert.match(alta.datos.msg, /signups not allowed/i);
});

test("sirve la config local y no sale del repo", async () => {
  const config = await fetch(entorno.url + "/web/supabase-config.js").then(r => r.text());
  assert.match(config, /location\.origin/);
  assert.doesNotMatch(config, /supabase\.co/);

  assert.equal((await fetch(entorno.url + "/")).url, entorno.url + "/web/");
  assert.equal((await fetch(entorno.url + "/web/index.html")).status, 200);
  // DATA~1 y GIT~1: los alias 8.3 de Windows, que no tienen punto.
  for (const ruta of ["/dev/.data/jwt-secreto", "/.git/config", "/.env", "/web/..%2f..%2fREADME.md",
                      "/dev/DATA~1/jwt-secreto", "/GIT~1/config", "/C:/Windows/win.ini"])
    assert.equal((await fetch(entorno.url + ruta)).status, 404, ruta);

  const ajeno = await new Promise(ok => request(entorno.url + "/web/", {headers: {Host: "atacante.example"}},
                                               r => ok(r.statusCode)).end());
  assert.equal(ajeno, 403, "atiende a un Host ajeno (DNS rebinding)");
});
