/* =============================================
   SERVICE WORKER — TALLER APP v1
   
   ¿Qué es esto?
   Un script que el navegador ejecuta en
   segundo plano, separado de la página.
   Su trabajo: guardar archivos en caché
   para que la app funcione sin internet.
   
   ⚠️ Cuando actualices la app, cambia
   "taller-app-v1" a "taller-app-v2", etc.
   Eso fuerza al SW a actualizar el caché.
============================================= */

// Cambiamos a v2 para forzar al móvil a borrar el caché viejo e instalar el nuevo
const NOMBRE_CACHE = "taller-app-v2"; 

const ARCHIVOS = [
  "./index.html",
  "./css/style.css",
  "./js/supabase-config.js", // <-- Agregamos este archivo obligatorio
  "./js/app.js",
  "./assets/img/fondo-login.png",
  "./assets/img/fondo-menu.png",
  "./assets/img/fondo-secciones.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

/* ------------------------------------------
   EVENTO: INSTALL
   
   Se dispara UNA SOLA VEZ: la primera vez
   que el usuario abre la app.
   
   Lo que hace: abre el caché con el nombre
   definido arriba y descarga/guarda todos
   los archivos de la lista ARCHIVOS.
   
   waitUntil → le dice al navegador "espera
   a que termine esto antes de continuar"
   
   skipWaiting → activa el SW inmediatamente,
   sin esperar a que el usuario cierre y
   vuelva a abrir la página
------------------------------------------ */
self.addEventListener("install", (evento) => {
  console.log("[SW] Instalando y guardando caché...");
  
  evento.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then((cache) => {
        console.log("[SW] Caché abierto, guardando archivos...");
        return cache.addAll(ARCHIVOS);
      })
      .then(() => {
        console.log("[SW] Todos los archivos guardados ✅");
      })
  );

  self.skipWaiting();
});

/* ------------------------------------------
   EVENTO: ACTIVATE
   
   Se dispara cuando el SW toma el control
   de la página (después de install).
   
   Lo que hace: revisa todos los cachés
   guardados en el navegador. Si encuentra
   uno con nombre diferente a NOMBRE_CACHE
   (es decir, una versión vieja), lo borra.
   
   Así evitas que el dispositivo acumule
   cachés viejos y ocupe espacio.
   
   clients.claim → toma control inmediato
   de todas las pestañas abiertas, sin
   necesidad de recargar
------------------------------------------ */
self.addEventListener("activate", (evento) => {
  console.log("[SW] Activando, limpiando cachés viejos...");

  evento.waitUntil(
    caches.keys().then((todosLosCaches) => {
      return Promise.all(
        todosLosCaches
          .filter((nombre) => nombre !== NOMBRE_CACHE)
          .map((nombreViejo) => {
            console.log("[SW] Borrando caché viejo:", nombreViejo);
            return caches.delete(nombreViejo);
          })
      );
    })
  );

  self.clients.claim();
});

/* ------------------------------------------
   EVENTO: FETCH
   
   Se dispara CADA VEZ que la app hace una
   petición de red (cargar CSS, JS, imágenes,
   llamadas a APIs, etc.)
   
   Lo que hace:
   1. Intercepta la petición
   2. Busca el archivo en el caché local
   3. Si está en caché → lo devuelve
      (funciona sin internet ✅)
   4. Si NO está en caché → va a internet
      normalmente (como siempre)
   
   Esta estrategia se llama "Cache First":
   primero caché, luego red.
   Es la mejor para apps que no cambian
   frecuentemente sus archivos.
   
   ⚠️ Las llamadas a EmailJS y a APIs
   externas van directo a internet (paso 4)
   porque no están en el caché.
------------------------------------------ */
self.addEventListener("fetch", (evento) => {
  // EXCLUSIÓN CRÍTICA PARA MÓVILES: No interceptar peticiones de autenticación/APIs ni métodos POST/PUT/DELETE
  if (
    evento.request.method !== "GET" || 
    evento.request.url.includes("supabase.co") || 
    evento.request.url.includes("emailjs.com")
  ) {
    return; // Deja que la petición vaya directo a internet sin pasar por el caché
  }

  evento.respondWith(
    caches.match(evento.request)
// ... rest del código sin alterar absolutamente nada más de tu función original
      .then((archivoEnCache) => {
        
        if (archivoEnCache) {
          // ✅ Encontrado en caché → lo devuelve sin tocar internet
          return archivoEnCache;
        }

        // ❌ No está en caché → va a buscar a internet
        return fetch(evento.request);
      })
  );
});