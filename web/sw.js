/* Service worker mínimo: existe para que la app sea instalable, y nada más.
 *
 * A propósito NO cachea: acabamos de pelear contra un tema.js viejo servido
 * de caché, y un service worker con cache-first es la versión industrial de
 * ese mismo problema. La frescura la garantizan los ?v= de cada recurso y el
 * must-revalidate de vercel.json; acá no se duplica esa responsabilidad. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* passthrough: la red decide */ });
