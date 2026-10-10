# AUDITORÍA COMPLETA - "Cita Stay" (Comparador de alojamientos en pareja)

> Documento de hallazgos para usar como prompt/instrucción de corrección.
> Estado: el build de Vite compila (OK), pero la app tiene errores funcionales,
> de seguridad, de despliegue y de producto. Todo lo siguiente está verificado
> leyendo el código.

---

## 0. RESUMEN EJECUTIVO

**App:** React 19 + Vite (front) + Express 5 (back, un solo archivo) que guarda los
"nidos" (espacios de pareja) en un `spaces.json`. Los dos movilizadores comparten
una sesión por código `AMOR-XXXX` + link de invitación.

**Veredicto:** es una demo funcional, **no es un producto listo para usar**. Los
problemas críticos son de seguridad (cero autenticación real, PIN evitable,
SSRF, PIN devuelto en la API, PII en git) y de despliegue (Vercel/Netlify
rotos, almacenamiento no persistente). Además hay un **engaño de producto**: la
app promete "iniciar sesión con Google" pero **NO usa el SDK de Google**; solo
pide que escribas un email.

Orden de corrección sugerido: **Seguridad (S) -> Datos/Persistencia (D) ->
Despliegue (P) -> Producto/UX (U) -> Calidad (Q)**.

---

## BLOQUE S — SEGURIDAD (CRITICOS, arreglar primero)

### S1. No hay autenticación real. Cualquiera con el código entra y escribe. [CRITICO]
`server.js` no tiene ni un solo middleware de sesión/token. **Todos** los
endpoints son públicos; el único "secreto" es el código `AMOR-XXXX`.
Cualquiera que adivine/adivine por fuerza bruta (4 dígitos = 10.000 intentos) o
consiga un enlace puede leer y modificar el nido. Peor: los endpoints que
crean el espacio lo hacen **automáticamente si no existe**
(`join-space`, `server.js:326-342`), así que "unirse" a un código inexistente
crea un espacio nuevo en vez de fallar -> no hay garantía de que el código
pertenezca a nadie.
**Impacto:** privacidad de la pareja (fotos, enlaces de viaje, comentarios) expuesta.
**Fix:** token opaco por nido (UUID) obligatorio en header `Authorization`, no
codes adivinables; sesiones firmadas; NO auto-crear en join (404 real).

### S2. El PIN es evitable por completo. [CRITICO]
Si un nido tiene PIN, el enlace de invitación (`?space=X&partner=p2`) y el
login por URL lo saltan: `App.jsx:42-50` marca `cita_authenticated = true` solo
con que la URL tenga `space` + `partner`, sin validar el PIN. Además
`server.js:276-280` permite crear nidos con `pin: ''` por defecto.
**Fix:** validar el PIN SIEMPRE en servidor (endpoint dedicado), nunca en el
cliente; exigirlo también en el flujo del enlace de invitación.

### S3. El PIN se devuelve en claro en la API. [CRITICO]
`GET /api/space/:spaceId` (`server.js:560-565`) hace spread de **todo** el
objeto, incluyendo `pin` y datos internos (`_isFreshInit`). Cualquier lectura del
nido filtra el PIN.
**Fix:** nunca devolver `pin`; responder con un DTO público (sin `pin`,
sin `_isFreshInit`); el PIN solo en compare/hash al escribir.

### S4. SSRF en el extractor de IA. [CRITICO]
`POST /api/ai/extract` (`server.js:828-875`) hace `fetch(url)` de una URL
**controlada por el cliente** sin validación: scheme, destino ni puerto. Un
atacante puede hacer que el servidor pida `http://169.254.169.254/...`
(metadatos de la nube), `http://localhost:3001/api/...` o `file://`.
**Fix:** allowlist de hosts (airbnb/booking/instagram/google maps), solo
`http/https`, bloquear IPs privadas/loopback/link-local, timeout y límite de
tamaño de respuesta, y NO seguir redirecciones a destinos no validados.

### S5. API key de Gemini traveled desde el cliente y se usa en el servidor sin validar. [ALTO]
El cliente guarda `apiKey` en `localStorage` y la manda en el body
(`App.jsx:349-353`, modales). El servidor la usa tal cual contra Google
(`server.js:878`, `904`). Riesgo: clave expuesta en cliente/logs, y alguien que
llame el endpoint sin clave usa la del servidor (`process.env.GEMINI_API_KEY`) ->
**proxy abierto** hacia una API de pago (abuso de cuota).
**Fix:** mover la clave SOLO al servidor (env),忽略 la del cliente, o quitarla del
flujo de usuario. Añadir rate-limit.

### S6. CORS abierto + sin rate limiting. [ALTO]
`app.use(cors())` (`server.js:17`) permite cualquier origen, y no hay ningún
rate-limit ni helmet. Combinado con S5 = Anyone puede agotar tu cuota de Gemini.
**Fix:** restringir CORS a tu dominio; añadir `helmet`, `express-rate-limit`
(especialmente en `/api/ai/*` y auth).

### S7. Datos personales (PII) versionadas en git. [ALTO]
`data/spaces.json` está **trackeado** (`git ls-files data/` lo confirma) y
contiene emails reales (ej. `lucas.test@gmail.com`) y datos de nidos. Cualquiera
con acceso al repo ve PII. Además `.gitignore` **no excluye `data/`.
**Fix:** añadir `data/` y `.env` al `.gitignore`, quitarlo del índice
(`git rm -r --cached data/`), rotar los emails/datos expuestos, y en adelante
guardar en BD, no en un JSON del repo.

---

## BLOQUE D — DATOS, PERSISTENCIA Y SINCRONIZACION (CRITICOS)

### D1. Merge "union" que RESUCITA elementos borrados y rompe el estado. [CRITICO]
Al hacer polling, `loadSpaceData` (`App.jsx:245-277`) y el endpoint `/sync`
(`server.js:461-490`) hacen merge por `id`. Aunque el cliente manda tombstones
(`deletedAccIds`), el merge **ignora el borrado en el servidor**: si un item se
borró en el server y el cliente aún lo tiene (o al revés), el merge por union
lo vuelve a colar. Peor, las reacciones se mezclan campo a campo de forma
asimétrica y los comentarios eligen el array "más largo" (`App.jsx:272-274`) ->
**el comentario más nuevo puede perder** y los borrados de comentarios nunca
se respetan de forma fiable.
**Fix:** sincronización con reloj lógico (vector clock / `updatedAt` por item) o
CRDT. Cada Accommodation debe tener `deletedAt`/`version`; el merge debe ser
"última escritura gana" por campo y respetar borrados, no "union por longitud".

### D2. Dos mecanismos de escritura que se pisan. [ALTO]
El cliente escribe por dos vías distintas:
1. Endpoints Específicos: `/accommodations`, `/reaction`, `/comment`, `DELETE`...
2. `POST /api/space/:id/sync` con el **estado completo** (`updateSpaceData(..., true)`).
El `/sync` hace `...incoming` (spread) y puede sobrescribir con datos
desactualizados lo que se acaba de escribir por la vía específica. Y el poll cada
4s re-marca.Resultado: lost updates / notas que "reaparecen".
**Fix:** una sola vía de escritura (idealmente todo por item, no full-state), con
versionado optimista.

### D3. Polling cada 4s + full-state = ineficiente y frágil. [MEDIO]
`useEffect` (`App.jsx:318-325`) hace `GET` del espacio completo cada 4s por
cliente. Con 2 pareja son 30 req/min cargando todo el JSON. No hay WebSocket/SSE,
ni push. Además `loadSpaceData` cambia de identidad cada vez que cambian las
dependencias, reiniciando timers.
**Fix:** migrar a SSE/WebSocket; si no, polling más lento + delta, y
`useCallback`/`useRef` estables.

### D4. Persistencia en Vercel es NO persistente (se pierde todo). [CRITICO - despliegue]
`server.js:21-23`: en serverless usa `/tmp/cita-data/spaces.json`, que es
**efímero por instancia**. En cada cold start / función nueva se pierde. El
commit mensajes "integrated Cloud KV", pero el KV (Upstash) es **opcional**: solo
si defines `KV_REST_API_URL/TOKEN`; si no, en Vercel no persiste nada.
**Fix:** base de datos real (Vercel Postgres/Neon/Supabase) o exigir/configurar
Upstash con migracion; nunca depender de `/tmp` ni de `fs` en serverless.

### D5. `vercel.json` reescribe TODO `/api/*` a un único archivo. [CRITICO - despliegue]
```
{ "source": "/api/(.*)", "destination": "/api/index.js" }
```
`api/index.js` solo importa la app Express y la llama como handler. En Vercel,
el routing nativo por archivo no soporta este patrón "catch-all" hacia una app
Express con sub-rutas de forma fiable -> puede devolver 404/500 en todos los
endpoints. Además `server.js` hace `if (process.env.VERCEL !== '1') app.listen`,
acoplándose a un valor exacto de VERCEL.
**Fix:** desplegar como un backend separado (Railway/Fly/Render/una VPS) o
convertir cada endpoint a una Serverless Function real; o fijar `runtime`/
`framework` correctamente. Verificar con curl real, no asumir.

### D6. `netlify.toml` sirve un front sin backend. [ALTO - despliegue]
Sólo compila y redirige a `index.html`; no hay functions de Netlify. Si publicas
en Netlify, **toda `/api/*` da 404** y la app cae al fallback offline.
**Fix:** o despliegas el backend de Express en Netlify Functions, o usas el
backend único en otro host y Netlify sólo como CDN con `proxy` hacia la API.

### D7. ID de nido aleatorio corto y colisionable. [MEDIO]
`AMOR-${random 1000-9000}` -> 9000 combinaciones, se puede colisionar/fuerza
brutar (y sin auth, S1). Además `create-space` no comprueba si ya existe.
**Fix:** IDs largos aleatorios (nanoid/UUID) o secuencia con verificación de
unicidad; combinado con auth por token.

---

## BLOQUE U — PRODUCTO / UX (ALTO)

### U1. El "login con Google" es una FALSA PROMESA. [CRITICO - producto]
`GoogleAuthModal` (`GoogleAuthModal.jsx`) NO usa Google Identity Services; solo
pide escribir un email y llama `POST /api/auth/google`, que crea el nido ligado a
ese string. No hay OAuth, ni token de Google, ni verificación. Cualquiera puede
"entrar" con el email de otro yclaiming su nido (`server.js:357-417` busca por
email). El README y los commits lo presentan como Google real.
**Impacto:** decepción + riesgo de robo de nido.
**Fix:** o implementar GIS real (Client ID + token ID verificado en servidor),
o quitar el botón y llamarlo "recuperar por email" sin falsa marca.

### U2. El enlace de invitación filtra PII en la URL. [ALTO]
`SharePartnerModal:39-42` mete `p1`, `p2`, `p1a`, `p2a` (nombres y avatares)
en query string. Quedan en el historial, se comparten por WhatsApp, y se ven en
cualquier logs/servidor. La URL ES la credencial (ver S1).
**Fix:** token opaco en el enlace; no meter PII en la URL.

### U3. Cualquiera puede votar/votar por ambos. [ALTO]
En la tarjeta (`AccommodationCard:42-62`, botones p1 y p2) y en la tabla
(`ComparisonTable:107,124`) se puede tocar el corazón del otro. No hay control de
"soy p1 o p2"; el "cambiar de pareja" es un toggle client-side sin permisos.
Rompe el concepto de Pareja.
**Fix:** un usuario = una identidad; fijar el rol al entrar y permitir tocar sólo
el propio corazón.

### U4. Nota/estado de reacción no se refresca al cambiar de pareja. [MEDIO]
`currentNote` se inicializa con `currentPartnerId` al montar y no se resetea al
cambiar de pareja (`AccommodationCard:37-40`); queda la nota del anterior.

### U5. Editar alojamiento no existe (solo agregar/borrar). [BAJO]
El backend tiene `PUT /accommodations/:accId` pero no hay UI para editar; los
datos auto-extraídos no se pueden corregir a mano tras guardar.

### U6. Accesibilidad. [MEDIO]
Botones de icono sin `aria-label`, modales sin `role="dialog"`, sin cierre con
`Esc`, sin focus-trap, divs con `onClick` (`Header:68 partner-pill`) no
accesibles por teclado, `user-scalable=no` bloquea zoom (`index.html:6`).

### U7. `formatCurrencyPrice` con parseo frágil. [MEDIO]
`formatters.js:9` quita todo lo no `[0-9.-]`, así que CLP "80.000" -> 80. El
comentario dice que usa punto de miles, pero el parser lo destruye. Riesgo de
mostrar precios equivocados.

---

## BLOQUE Q - CALIDAD / MANTENIMIENTO (MEDIO-BAJO)

### Q1. Lint roto en el entorno. [BAJO]
`npm run lint` (oxlint) falla: no encuentra el native binding de Windows
(`@oxlint/binding-win32-x64-msvc`). Reinstall de node_modules o fijar versión.

### Q2. Imports no usados. [BAJO]
Muchos iconos importados sin usar (p.ej. `Plus`, `Sparkles`, `Heart` en
`App.jsx`; varios en `AddAccommodationModal`, `CoupleSettingsModal`, etc.).
oxlint lo marcaría; limpiar.

### Q3. Handlers con estado stale y efectos con deps faltantes. [MEDIO]
`AiConciergeModal:61-65` dispara el fetch dentro de un `useEffect` con deps
`[isOpen, accommodations]` pero usa `recommendation` y `fetchRecommendation`;
puede pedir en bucle o pedir de más. Falta `AbortController` para cancelar
peticiones al cerrar el modal (fuga de estado en setState tras unmount).

### Q4. `showToast` con temporizadores sin limpiar. [BAJO]
`App.jsx:160-163` no limpia el `setTimeout`; si se llama rápido, el toast se
borra antes de tiempo y puede haber fugas.

### Q5. Side-effects en useState initializer. [MEDIO]
`App.jsx:31-50` escribe en `localStorage` dentro de inicializadores de `useState`
(ej. para `partnerFromUrl`). En `StrictMode` (main.jsx) los inicializadores se
ejecutan dos veces; los efectos colaterales ahí son un antipatrón.

### Q6. `onKeyDown Enter` en input de nota sin `preventDefault`. [BAJO]
`AccommodationCard:236` dispara guardado con Enter pero no evita el submit del
formulario padre en algunos navegadores -> submit inesperado.

### Q7. Modales en `CommentsModal`/`AiConcierge` no)aíslan scroll del body. [BAJO]
Varios `.modal-overlay` no bloquean el scroll del fondo.

---

## MATRIZ DE PRIORIDAD

| ID | Sev | Bloque | Titulo |
|----|-----|--------|--------|
| S1 | CRIT | Seg  | Sin autenticacion real |
| S2 | CRIT | Seg  | PIN evitable |
| S3 | CRIT | Seg  | PIN devuelto en la API |
| S4 | CRIT | Seg  | SSRF en extractor |
| S7 | ALTO | Seg  | PII en git |
| S5 | ALTO | Seg  | API key expuesta / proxy Gemini |
| S6 | ALTO | Seg  | CORS abierto, sin rate-limit |
| D4 | CRIT | Despl| Persistencia serverless no persistente |
| D5 | CRIT | Despl| vercel.json catch-all rompe API |
| D6 | ALTO | Despl| Netlify sin backend |
| D1 | CRIT | Dat  | Merge resucita borrados / lost updates |
| D2 | ALTO | Dat  | Dos vias de escritura se pisan |
| D3 | MEDIO | Dat  | Polling 4s full-state |
| D7 | MEDIO | Dat  | ID de nido corto/colisionable |
| U1 | CRIT | Prod | "Google login" falso |
| U2 | ALTO | Prod | PII en URL de invitacion |
| U3 | ALTO | Prod | Se puede votar por ambos |
| U4 | MEDIO | Prod | Nota stale al cambiar pareja |
| U7 | MEDIO | Prod | Parser de moneda fragil |
| U5 | BAJO | Prod | Sin UI para editar |
| U6 | MEDIO | Prod | Accesibilidad |
| Q3 | MEDIO | Cal  | Fetch en bucle / sin abort |
| Q5 | MEDIO | Cal  | Side-effects en useState |
| Q1..Q7| BAJO | Cal  | Lint, imports, timers, etc. |

---

## PLAN DE CORRECCION SUGERIDO (prompt de ejecucion)

> Corrige esta app "Cita Stay" en este orden. No rompas la funcionalidad de
> votos/matches. Antes de cada bloque, lee el archivo y confirma el problema.

**Fase 1 - Seguridad (S1-S7):**
1. Añade tokens opacos por nido (UUID) + sesión; elimina la auto-creación en
   join; exige PIN en servidor siempre; deja de devolver `pin`/`_isFreshInit`.
2. Valida y allowlisteia el extractor de IA (bloquea SSRF, IPs privadas,
   esquemas no http(s), seguido de redirects); mueve la clave Gemini al
   servidor; añade helmet + rate-limit + CORS restringido.
3. Saca `data/` y `.env` del control de versiones; rota PII expuesta.

**Fase 2 - Datos/Despliegue (D1-D7):**
4. Versionado por Accommodation (`version`/`updatedAt`) y merge "última
   escritura gana" respetando borrados (sin unión por longitud); una sola vía
   de escritura o versionado optimista.
5. Backend en BD persistente (no `/tmp`, no `fs` en serverless); arregla el
   despliegue de Vercel (o hosting único) y Netlify.

**Fase 3 - Producto/UX (U1-U7):**
6. Implementa GIS real o retira el botón "Google"; token opaco en el enlace de
   invitación (sin PII); fija el rol del usuario (no votar por ambos);
   resetea la nota al cambiar de pareja; corrige el parser de moneda;
   accesible (labels, Esc, focus-trap, sin bloquear zoom).

**Fase 4 - Calidad (Q):**
7. Arregla lint, limpia imports, deps de efectos, temporizadores, form submit.

Al final, ejecuta `npm run lint` y `npm run build` y `npm start` + curl a
`/api/health`, `/api/auth/create-space`, `/api/space/:id` para verificar que no
filtran el PIN y que la sincronización entre dos clientes no resucita borrados.