# 🗺️ Contexto Completo de VibeTribe

## ¿Qué es VibeTribe?

**VibeTribe** es una aplicación mobile-first (PWA) para conectar personas con intereses de viaje similares. Los usuarios pueden **crear paquetes de viaje grupales**, unirse a paquetes de otros, y gestionar su perfil de viajero. Está completamente en español e inspirada en el concepto de "tu vibra es tu pasaporte".

---

## 🏗️ Arquitectura General

```
proy_vibetribe/                    ← Monorepo raíz (Turborepo + Bun)
├── apps/
│   └── web/                       ← Frontend SPA/PWA (React + TanStack Router + Vite)
└── packages/
    ├── backend/                   ← Backend Convex (DB + Auth + APIs serverless)
    ├── ui/                        ← Design System compartido (shadcn/ui)
    ├── env/                       ← Variables de entorno validadas con Zod
    └── config/                    ← Configuración TypeScript base compartida
```

**Flujo de datos:**
```
Usuario → React (TanStack Router) → Convex React Client (WebSocket reactivo) → Convex Cloud (DB + Auth)
                                  ↘ Better Auth Client → HTTP Endpoints (Convex HTTP Actions)
```

---

## 📦 Módulos de Mayor a Menor Criticidad

---

### 🔴 CRÍTICO 1 — Base de Datos (Schema)
**Archivo:** `packages/backend/convex/schema.ts`

Define las **5 tablas** de la base de datos Convex:

| Tabla | Descripción |
|---|---|
| `profiles` | Perfil del viajero: descripción, destinos favoritos, avatar (base64), rating, ligado al `userId` de Better Auth |
| `travelPackages` | El corazón del negocio: paquete de viaje con título, destino, fechas, precio, cupos, estado (`draft`/`published`/`cancelled`), tags, alojamiento |
| `travelPackageParticipants` | Relación N:M entre usuarios y paquetes — quién se unió a qué viaje y cuándo |
| `travelPackageActivities` | Actividades incluidas en un paquete (título, descripción, fecha, costo, si está incluida) |
| `todos` | Tabla de prueba/demo del boilerplate original (no en producción activa) |

**Índices clave:**
- `profiles.by_userId` — búsqueda de perfil por usuario
- `travelPackages.by_creatorId` — mis viajes
- `travelPackages.by_status` — filtrar publicados/borradores
- `travelPackageParticipants.by_package_and_user` — evitar duplicados al unirse

---

### 🔴 CRÍTICO 2 — Autenticación
**Archivo:** `packages/backend/convex/auth.ts`

Configura **Better Auth** integrado con Convex. Provee:

- **Email + Password** con verificación de correo **obligatoria** (OTP de 6 dígitos)
- **Google OAuth** (Social Login)
- **Plugin `emailOTP`**: maneja flujos de verificación de cuenta, recuperación de contraseña y cambio de email — todo vía OTP
- **Plugin `crossDomain`**: permite que el frontend (puerto 3001) hable con el backend Convex (dominio diferente)
- **Envío de emails**: integrado con **Resend** + componente `@convex-dev/resend`, emails desde `vibetribe@elcokiin.my`
- **`getCurrentUser`**: query pública que retorna el usuario autenticado actual

**Archivo:** `packages/backend/convex/http.ts`

Registra las rutas HTTP de Better Auth (para que el cliente pueda hacer sign-in/sign-up via HTTP REST, no solo WebSocket), con CORS habilitado para el `SITE_URL`.

**Archivo:** `packages/backend/convex/auth.config.ts`

Config mínima para el componente Convex de Better Auth (JWKS keys, etc.)

**Archivo:** `apps/web/src/lib/auth-client.ts`

Cliente de Better Auth en el frontend:
```ts
export const authClient = createAuthClient({
  baseURL: env.VITE_CONVEX_SITE_URL,
  plugins: [crossDomainClient(), convexClient()],
});
```
Expone: `authClient.signIn.email()`, `authClient.signIn.social()`, `authClient.emailOtp.*`, `authClient.signUp.*`

---

### 🔴 CRÍTICO 3 — Lógica de Paquetes de Viaje
**Archivo:** `packages/backend/convex/packages.ts` (426 líneas)

El módulo más grande. Funciones Convex:

| Función | Tipo | Descripción |
|---|---|---|
| `create` | mutation | Crea un paquete de viaje; el creador se añade automáticamente como primer participante |
| `list` | query | Lista paquetes con filtros: búsqueda de texto, status, fechas, duración; incluye info del creador |
| `getMine` | query | Lista solo los paquetes del usuario autenticado |
| `getById` | query | Detalle completo: paquete + actividades + participantes (con perfil) + organizador |
| `update` | mutation | Edita un paquete; solo el creador puede hacerlo |
| `remove` | mutation | Elimina un paquete; solo el creador |
| `joinPackage` | mutation | Un usuario se une a un paquete publicado con cupos disponibles; previene duplicados |
| `addActivity` | mutation | El creador añade actividades a su paquete |
| `seedMockPackages` | mutation | Carga 3 paquetes de ejemplo (Cusco, Tulum, Patagonia) — función de desarrollo/demo |

**Reglas de negocio implementadas:**
- Un creador no puede unirse a su propio paquete
- No se puede unir dos veces al mismo viaje
- Validación de fechas: endDate > startDate
- Solo el creador puede editar/eliminar

---

### 🔴 CRÍTICO 4 — Perfiles de Usuarios
**Archivo:** `packages/backend/convex/profiles.ts`

| Función | Tipo | Descripción |
|---|---|---|
| `getMine` | query | Obtiene el perfil del usuario; si no existe, retorna un perfil vacío con los datos de Better Auth (nombre, email, imagen de Google) |
| `updateMine` | mutation | Crea o actualiza el perfil del usuario (descripción, destinos favoritos, avatarUrl en base64); deduplica destinos |

**Patrón importante:** la tabla `profiles` está separada de los datos de autenticación (que vive en el componente `betterAuth`). `profiles` extiende al usuario con datos de la app.

---

### 🔴 CRÍTICO 5 — Punto de entrada del Frontend
**Archivo:** `apps/web/src/main.tsx`

Inicializa:
1. `ConvexReactClient` → conexión WebSocket al backend Convex
2. `createRouter` (TanStack Router) → sistema de enrutamiento
3. `ConvexBetterAuthProvider` → envuelve toda la app, conecta Convex + Auth

---

### 🟠 IMPORTANTE 1 — Enrutamiento y Páginas

**Archivo:** `apps/web/src/routes/__root.tsx`

Layout raíz de toda la aplicación:
- `ThemeProvider` (dark mode por defecto, vía `next-themes`)
- `Toaster` (notificaciones de sonner)
- `TanStackRouterDevtools` (herramienta de debug)
- SEO: title "VibeTribe" + meta description

**Páginas disponibles:**

| Ruta | Archivo | Descripción |
|---|---|---|
| `/` | `routes/index.tsx` | **Pantalla de bienvenida** — hero image, logomark, botón "Comenzar" que lleva al login |
| `/dashboard` | `routes/dashboard.tsx` | **Dashboard principal** — lista de viajes, filtros, "Mis Viajes"; muestra SignIn/SignUp si no autenticado |
| `/profile` | `routes/profile.tsx` | **Perfil del usuario** — ver/editar descripción, foto, destinos favoritos; sign out |
| `/packages/create` | `routes/packages/create.tsx` | **Crear paquete** — formulario completo con imagen, Google Maps, tags, logística |
| `/packages/$id` | `routes/packages/$id.tsx` | **Detalle de paquete** — info, actividades, participantes, botón "Unirse" |
| `/packages/$id/edit` | `routes/packages/$id/edit.tsx` | **Editar paquete** — formulario de edición (solo el creador) |

---

### 🟠 IMPORTANTE 2 — Componentes del Frontend

**Componentes en `apps/web/src/components/`:**

| Componente | Descripción |
|---|---|
| `sign-in-form.tsx` (615 líneas) | Formulario de login multi-step: login normal → verificación OTP → recuperar contraseña; Google OAuth; persistencia en localStorage |
| `sign-up-form.tsx` | Registro de usuario con validación + flujo OTP de verificación de email |
| `package-card.tsx` | Tarjeta de paquete de viaje con imagen, precio (formato COP), fechas, cupos, tags, link al detalle |
| `package-filters.tsx` | Filtros: búsqueda por texto, tags predefinidos, rango de precio |
| `location-input.tsx` | Input con autocompletado de Google Maps Places API (con debounce 300ms, navegación por teclado) |
| `google-map.tsx` | Componente de mapa embebido |
| `user-menu.tsx` | Menú de usuario con avatar, nombre, link al perfil |
| `header.tsx` | Header de la app |
| `page-header.tsx` | Header de página interior con botón back y acciones opcionales |
| `mode-toggle.tsx` | Toggle dark/light mode |
| `theme-provider.tsx` | Provider de `next-themes` |
| `loader.tsx` | Spinner de carga genérico |

---

### 🟡 SECUNDARIO 1 — Design System Compartido
**Paquete:** `packages/ui/src/`

Componentes shadcn/ui listos para usar en toda la app:

| Componente | Propósito |
|---|---|
| `button.tsx` | Botón con variantes (default, outline, ghost, destructive, secondary) |
| `input.tsx` | Input de texto |
| `label.tsx` | Label de formulario |
| `card.tsx` | Contenedor de tarjeta |
| `badge.tsx` | Etiqueta/badge |
| `avatar.tsx` | Avatar con imagen y fallback |
| `skeleton.tsx` | Placeholder de carga animado |
| `dialog.tsx` | Modal/dialog |
| `dropdown-menu.tsx` | Menú desplegable |
| `alert-dialog.tsx` | Dialog de confirmación |
| `checkbox.tsx` | Checkbox |
| `sonner.tsx` | Wrapper del toast de Sonner |

Importación: `import { Button } from "@proy_vibetribe/ui/components/button"`

---

### 🟡 SECUNDARIO 2 — Variables de Entorno
**Archivo:** `packages/env/src/web.ts`

Valida con Zod las variables de entorno del frontend (usando `@t3-oss/env-core`):

| Variable | Tipo | Descripción |
|---|---|---|
| `VITE_CONVEX_URL` | URL | URL del deployment Convex (WebSocket) |
| `VITE_CONVEX_SITE_URL` | URL | URL del HTTP endpoint de Convex (para Auth) |
| `VITE_GOOGLE_MAPS_API_KEY` | string? | API Key de Google Maps (opcional) |

---

### 🟡 SECUNDARIO 3 — Configuración de Build
**Archivo:** `apps/web/vite.config.ts`

- Puerto: `3001`
- Plugins: TailwindCSS v4 (via `@tailwindcss/vite`), TanStack Router (code-splitting automático), React, PWA
- **PWA manifest:** nombre "Vibe Tribe", pantalla standalone, fondo `#0c0c0c`

**Archivo:** `turbo.json`

Tareas Turborepo:
- `dev` — desarrollo paralelo de todos los paquetes (persistente, sin cache)
- `build` — build en orden (respeta dependencias entre paquetes)
- `check-types` — TypeScript check en cascada
- `dev:setup` — setup inicial de Convex

---

### 🟢 MENOR — Módulos de Apoyo
- **`packages/backend/convex/sendEmails.ts`** — helper de envío de emails (wrapper de Resend)
- **`packages/backend/convex/healthCheck.ts`** — endpoint de health check de Convex
- **`packages/backend/convex/privateData.ts`** — funciones de datos privados/internos
- **`packages/backend/convex/todos.ts`** — CRUD básico de todos (herencia del boilerplate, no en producción)
- **`packages/config/tsconfig.base.json`** — config TypeScript base heredada por todos los paquetes

---

## 🛠️ Mapa de Tecnologías

### Runtime y Build

| Tecnología | Versión | Rol |
|---|---|---|
| **Bun** | 1.3.13 | Package manager y runtime (reemplaza npm/node para tasks del monorepo) |
| **Turborepo** | ^2.8.12 | Orquestador del monorepo — ejecuta tareas en paralelo con caché |
| **TypeScript** | ^6 | Tipado estático en toda la app (frontend, backend, paquetes compartidos) |
| **Vite** | ^8.0.8 | Bundler/dev server ultrarrápido para el frontend |

### Frontend Core

| Tecnología | Versión | Rol |
|---|---|---|
| **React** | ^19.2.5 | Library UI; usa los nuevos hooks y concurrent features |
| **TanStack Router** | ^1.168.22 | Enrutamiento file-based con type-safety completo; genera `routeTree.gen.ts` automáticamente; code-splitting por ruta |
| **TanStack Form** | ^1.28.0 | Manejo de formularios con validación integrada de Zod (sign-in, sign-up) |

### Estilos

| Tecnología | Versión | Rol |
|---|---|---|
| **Tailwind CSS** | ^4.2.2 | Utility-first CSS; versión 4 (nueva arquitectura via Vite plugin, sin `tailwind.config.js`) |
| **shadcn/ui** | — | Componentes UI sin estilos forzados basados en Radix UI primitives |
| **next-themes** | ^0.4.6 | Dark/light mode management con soporte a system preference |
| **lucide-react** | ^1.8.0 | Iconografía SVG (~1000 iconos) |

### Backend (Convex)

| Tecnología | Versión | Rol |
|---|---|---|
| **Convex** | ^1.33.1 | Backend-as-a-Service: base de datos reactiva, queries/mutations/actions serverless, WebSockets automáticos, deployments en la nube |
| **@convex-dev/better-auth** | ^0.11.4 | Adaptador que integra Better Auth con la base de datos Convex (maneja las tablas de sesiones, usuarios, cuentas OAuth internamente) |
| **@convex-dev/resend** | — | Componente Convex para enviar emails vía Resend desde funciones serverless |

### Autenticación

| Tecnología | Versión | Rol |
|---|---|---|
| **Better Auth** | 1.5.3 | Framework de autenticación server-side; maneja sesiones, JWT, OAuth; es la alternativa moderna a NextAuth pero para cualquier framework |
| **Plugin emailOTP** | — | Añade flujo de verificación y reset de contraseña via OTP de 6 dígitos al email |
| **Plugin crossDomain** | — | Permite que el auth funcione entre dominios diferentes (frontend en 3001 ↔ Convex cloud) |
| **Google OAuth** | — | Login social con Google (clientId/clientSecret en env variables) |

### Comunicación y Email

| Tecnología | Rol |
|---|---|
| **Resend** | Servicio de envío de emails transaccionales (verificación OTP, recuperación de contraseña); dominio: `elcokiin.my` |
| **WebSockets (Convex)** | Convex mantiene una conexión WebSocket persistente para que las queries sean reactivas en tiempo real (el dashboard se actualiza solo cuando cambia la DB) |

### Validación

| Tecnología | Versión | Rol |
|---|---|---|
| **Zod** | ^4.1.13 | Validación de esquemas en TypeScript: formularios (TanStack Form), variables de entorno (`@t3-oss/env-core`), search params de rutas |
| **Convex validators** | — | `v.string()`, `v.number()`, etc. — validación de args de funciones Convex en el backend |

### Integraciones Externas

| Tecnología | Rol |
|---|---|
| **Google Maps Places API** | Autocompletado de ubicaciones en el formulario de creación de paquetes (`location-input.tsx`) |
| **@googlemaps/js-api-loader** | Carga dinámica del SDK de Google Maps |

### UX y Notificaciones

| Tecnología | Versión | Rol |
|---|---|---|
| **Sonner** | ^2.0.7 | Librería de toasts/notificaciones (reemplaza react-hot-toast); se usa en todas las acciones para feedback al usuario |
| **date-fns** | ^4.1.0 | Formateo de fechas con localización español (es) |
| **input-otp** | ^1.4.2 | Componente de input para códigos OTP |

### PWA

| Tecnología | Rol |
|---|---|
| **vite-plugin-pwa** | Genera el Service Worker y el manifest automáticamente para que la app sea instalable como app nativa |
| **@vite-pwa/assets-generator** | Genera todos los tamaños de íconos PWA desde una imagen fuente |

---

## 🔄 Flujo de Datos Completo

### Autenticación
```
1. Usuario llena SignInForm/SignUpForm
2. → authClient.signIn.email() / authClient.signUp.email()
3. → HTTP request al VITE_CONVEX_SITE_URL (Convex HTTP Action)
4. → Better Auth procesa, guarda sesión en Convex DB
5. → Retorna JWT / Cookie de sesión
6. → ConvexBetterAuthProvider detecta la sesión
7. → Componentes <Authenticated> / <Unauthenticated> reaccionan
```

### Queries en Tiempo Real
```
1. Componente usa useQuery(api.packages.list, {})
2. → Convex cliente abre subscripción WebSocket
3. → Convex ejecuta la query en el servidor
4. → Retorna datos reactivos (se actualizan automáticamente)
5. → Sin necesidad de polling ni invalidación manual
```

### Mutaciones
```
1. Usuario hace acción (crear viaje, unirse, etc.)
2. → useMutation(api.packages.create)
3. → Convex ejecuta mutation (serverless)
4. → DB se actualiza
5. → TODAS las queries suscritas a datos afectados se re-ejecutan automáticamente
6. → UI se actualiza en tiempo real para todos los usuarios conectados
```

---

## 📁 Archivos Clave para Agregar Funcionalidades

Si quieres agregar algo, estos son los archivos que más probablemente tocarás:

| Qué quieres hacer | Archivos a modificar |
|---|---|
| Nueva tabla en DB | `packages/backend/convex/schema.ts` |
| Nueva función del backend | Nuevo archivo en `packages/backend/convex/` |
| Nueva página/ruta | Nuevo archivo en `apps/web/src/routes/` |
| Nuevo componente reutilizable | `apps/web/src/components/` o `packages/ui/src/components/` |
| Nuevo componente shadcn/ui | `npx shadcn@latest add <component> -c packages/ui` |
| Nueva variable de entorno | `packages/env/src/web.ts` |
| Cambiar estilos globales | `packages/ui/src/styles/globals.css` |

> [!NOTE]
> Recuerda que después de modificar el schema de Convex, debes hacer deploy de las funciones con `bun run dev:server` o `npx convex deploy` para que los cambios apliquen.
