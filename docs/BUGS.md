# Registro de Bugs

## Convenciones

Cada bug se documenta con:
- **ID**: `BUG-XXX`
- **Estado**: 🔴 Abierto | 🟢 Resuelto | 🟡 Workaround
- **Severidad**: Crítico | Alto | Medio | Bajo

---

## BUG-001: Prisma 7 — `url` no permitido en schema.prisma

| Campo | Detalle |
|-------|---------|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Crítico |
| **Afecta** | `prisma generate`, `prisma migrate dev` |
| **Fecha** | Marzo 2026 |

### Síntoma
```
Error: The datasource property `url` is no longer supported in schema files.
```

### Causa
Prisma 7 eliminó soporte para `url = env("DATABASE_URL")` dentro del bloque `datasource` del schema. La URL de conexión ahora debe configurarse exclusivamente en `prisma.config.ts`.

### Solución
1. Eliminar `url` del `datasource` en `schema.prisma`:
```prisma
datasource db {
  provider = "mysql"
  // Sin url — va en prisma.config.ts
}
```
2. Configurar la URL en `prisma.config.ts`:
```ts
import { defineConfig } from 'prisma/config'
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
```

---

## BUG-002: Prisma 7 — `prisma migrate dev` no encuentra `datasource.url`

| Campo | Detalle |
|-------|---------|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Crítico |
| **Afecta** | `prisma migrate dev`, `prisma db push` |
| **Fecha** | Marzo 2026 |

### Síntoma
```
Error: The datasource.url property is required in your Prisma config file when using prisma migrate dev.
```

### Causa
El `prisma.config.ts` usaba propiedades obsoletas: `earlyAccess: true`, `migrate.url()` como función async, y `path.join(__dirname, ...)` para la ruta del schema. La API cambió en la versión estable de Prisma 7.

### Solución
Usar el formato correcto de `defineConfig`:
```ts
import { defineConfig } from 'prisma/config'
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
```

**Importante con Bun**: Usar siempre `bunx --bun prisma <comando>` (el flag `--bun` es requerido para que Prisma use el runtime de Bun).

---

## BUG-003: Prisma 7 — `PrismaClient` requiere driver adapter

| Campo | Detalle |
|-------|---------|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Crítico |
| **Afecta** | Runtime: cualquier query a la base de datos |
| **Fecha** | Marzo 2026 |

### Síntoma
```
PrismaClientInitializationError: `PrismaClient` needs to be constructed with a non-empty, valid `PrismaClientOptions`
```

### Causa
Prisma 7 eliminó el motor Rust. `new PrismaClient()` sin argumentos ya no funciona. Se necesita un **driver adapter** nativo de JavaScript.

### Solución
1. Instalar el adapter: `bun add @prisma/adapter-mariadb`
2. Instanciar con adapter:
```ts
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  connectionLimit: 5,
})
const prisma = new PrismaClient({ adapter })
```

---

## BUG-004: Nuxt 4 — `~/server/utils/` se resuelve a `app/server/utils/`

| Campo | Detalle |
|-------|---------|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Alto |
| **Afecta** | Todos los API routes que importaban utils |
| **Fecha** | Marzo 2026 |

### Síntoma
```
Error: Could not load C:/Users/HP/.../app//server/utils/prisma
ENOENT: no such file or directory
```

### Causa
En Nuxt 4, el alias `~` apunta al directorio `app/`, no a la raíz del proyecto. Los imports `import prisma from '~/server/utils/prisma'` se resolvían a `app/server/utils/prisma` que no existe.

### Solución
Eliminar todos los imports explícitos de `~/server/utils/` en los archivos de `server/api/`. Nitro **auto-importa** automáticamente todo lo exportado desde `server/utils/`, por lo que los imports manuales son innecesarios.

Se ejecutó un script PowerShell para eliminar las 24+ líneas de imports afectadas en todos los archivos API.

---

## BUG-005: Prisma — Import `@prisma/client` causa error `.prisma/client` en Nitro

| Campo | Detalle |
|-------|---------|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Crítico |
| **Afecta** | Runtime en desarrollo |
| **Fecha** | Marzo 2026 |

### Síntoma
```
Invalid module ".prisma/client/default" is not a valid package name
imported from C:\...\contable\.nuxt\dev\index.mjs
```

### Causa
Cuando el generator de Prisma usa el output por defecto (`node_modules/@prisma/client`), los módulos internos de `.prisma/client` no se resuelven correctamente en el bundler de Nitro.

### Solución
Usar un output personalizado para el Prisma Client generado:
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}
```
Y actualizar los imports:
```ts
import { PrismaClient } from '../../generated/prisma/client'
```
Agregar `generated/` al `.gitignore`.

---

## BUG-006: ESM Loader — `Received protocol 'c:'` en Windows

| Campo | Detalle |
|-------|---------|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Crítico |
| **Afecta** | Runtime en desarrollo (Windows) |
| **Fecha** | Marzo 2026 |

### Síntoma
```
Error: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader.
On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'
```

### Causa real
En **Nitro dev**, el preset usa `externals: { trace: false }`. Al marcar dependencias como external, Rollup puede emitir `import … from 'C:\ruta\…'` (ruta absoluta sin esquema). Node ESM interpreta `C:` como protocolo inválido. En este proyecto el caso visible era **`xlsx`** → submódulo `dist/cpexcel.js` (no Prisma).

### Solución
Plugin Rollup `generateBundle` en `nuxt.config.ts` (`fix-windows-drive-letter-esm-imports`) que reescribe `from 'D:\…'` e `import('D:\…')` a URLs `file:///`. Además: Prisma sigue en `nitro.externals.external` + `traceInclude`; `xlsx` en external + trace para despliegue.

---

## BUG-007: `tsx` no funciona con `bunx --bun prisma db seed`

| Campo | Detalle |
|-------|---------|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Medio |
| **Afecta** | `prisma db seed` |
| **Fecha** | Marzo 2026 |

### Síntoma
```
error: preload not found "file:///C:/.../node_modules/tsx/dist/loader.mjs"
Error: Command failed with exit code 1: tsx prisma/seed.ts
```

### Causa
Cuando Prisma ejecuta el seed command con el runtime de Bun (`--bun`), `tsx` (un loader de TypeScript para Node) no es compatible.

### Solución
El seed del repo usa Bun directamente (sin `tsx`): en `package.json` y `prisma.config.ts` está `bun prisma/seed.ts`. Para sembrar a mano:
```bash
bun prisma/seed.ts
```
Si antes usabas `bunx --bun prisma db seed` con `tsx` en el comando de seed, deja de usar `tsx` (Bun ejecuta TypeScript nativo).

---

## BUG-008: Recargar la página redirige a `/login` aunque la sesión siga válida

| Campo | Detalle |
|-------|---------|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Alto |
| **Afecta** | `app/middleware/auth.global.ts`, cualquier ruta protegida |
| **Fecha** | Marzo 2026 |

### Síntoma
Tras iniciar sesión, un **refresh completo (F5)** o la primera carga en SSR enviaba al usuario a `/login` aunque la cookie `auth_token` existiera en el navegador.

### Causa
El middleware global ejecuta `$fetch('/api/auth/me')` también **en el servidor**. En ese contexto, `$fetch` no reenvía automáticamente el header `Cookie` del request original del cliente, por lo que `me.get.ts` no veía el token y respondía 401.

### Solución
Pasar los headers del request entrante al `$fetch` interno:

```ts
const headers = useRequestHeaders(['cookie'])
await $fetch('/api/auth/me', { headers })
```

Ver [ARCHITECTURE.md](ARCHITECTURE.md) (flujo de autenticación).

---

## BUG-009: La tasa de IGV configurada nunca se aplicaba

| | |
|---|---|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Crítico |
| **Afecta** | Todos los comprobantes, el Resumen Mensual y el Cierre Anual |
| **Fecha** | Agosto 2026 |

### Síntoma
`TaxParameter.igvPercent` existía en la base de datos y era editable en `/configuracion`, pero cambiarlo no alteraba ni un importe. Una boleta de restaurante de S/ 51 acogida a la Ley 31556 (10%) se guardaba como base 43.22 e IGV 7.78 en vez de 46.36 y 4.64, inflando el crédito fiscal.

### Causa
`calcularBaseEIGV(total, afectoIgv, igvPercent = 18)` aceptaba la tasa como tercer argumento, pero **ninguno de sus cinco call-sites lo pasaba**, así que siempre caía en el default.

### Solución
La tasa pasó a ser un campo del propio comprobante (`Voucher.igvPercent`) junto con `regimenIgv`, que decide a qué casillas del Formulario 0621 va el importe. El cálculo se centralizó en `server/utils/voucherPayload.ts`, que resuelve la tasa (valor explícito → preset del régimen → default del año) antes de llamar a `calcularBaseEIGV`. Migración `20260821000001_add_igv_percent_to_voucher` con backfill, afinada por `20260821000004_fix_igv_percent_backfill`.

---

## BUG-010: Guardar en `/configuracion` reseteaba las tasas de IR

| | |
|---|---|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Alto |
| **Afecta** | `app/pages/configuracion.vue`, `server/api/settings/tax-params.put.ts` |
| **Fecha** | Agosto 2026 |

### Síntoma
Los inputs de IR mensual y de los tramos anuales eran **inertes**: se podían editar en pantalla, pero al guardar y recargar volvían al valor anterior.

### Causa
El estado local usaba `irMensualPercent` / `irAnualTramo1` / `irAnualTramo2`, mientras que la API lee y escribe `irMonthlyPercent` / `irAnnualTramo1Rate` / `irAnnualTramo2Rate`. `Object.assign(tax, data)` **añadía** las claves buenas junto a las malas; los `<input>` bindeaban a las malas y el guardado enviaba ambas, ganando las buenas con el valor *cargado*.

### Solución
Renombrar el estado local para que coincida con las columnas, sustituir el `Object.assign` por asignación campo a campo y añadir el input que faltaba para `irAnnualTramo1Limit`.

---

## BUG-011: Upserts que borraban los campos no enviados

| | |
|---|---|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Alto |
| **Afecta** | `server/api/annual-closure/update.put.ts`, `server/api/settings/tax-params.put.ts` |
| **Fecha** | Agosto 2026 |

### Síntoma
En `/cierre-anual` cada edición de un campo manual dejaba los otros seis en 0.

### Causa
El `update` del upsert reescribía **cada campo ausente del body** con su default, y la página envía un campo por vez.

### Solución
Construir el objeto de `update` solo con las claves presentes en el body; los defaults quedan únicamente en el `create`.

---

## BUG-012: El sidebar se colapsaba al navegar en escritorio

| | |
|---|---|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Medio |
| **Afecta** | `app/components/layout/Sidebar.vue`, `app/layouts/default.vue` |
| **Fecha** | Agosto 2026 |

### Síntoma
Cada click en un ítem del menú alternaba el estado del sidebar en escritorio.

### Causa
`@click="$emit('toggle')"` en cada `NuxtLink`. La intención era cerrar el drawer en móvil, pero se aplicaba a todos los tamaños.

### Solución
Separar los eventos: `toggle` lo emite solo el botón de colapsar; `navigate` lo emiten los links y el layout únicamente cierra el drawer si `isMobile`. El estado pasó a `useCookie` para sobrevivir a las recargas y resolverse ya en SSR.

---

## BUG-013: Acceso directo por id sin comprobar la empresa (IDOR)

| | |
|---|---|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Crítico |
| **Afecta** | 14 puntos: `vouchers/[id].{get,put,delete}`, `duplicate.post`, `inventory-assets/[id].{put,delete}`, `users/[id].{put,delete}` |
| **Fecha** | Agosto 2026 |

### Síntoma
Con una sola empresa no se notaba. Al pasar a multi-empresa, `GET /api/vouchers/42` habría servido el comprobante 42 fuera cual fuera su dueño, y `PUT`/`DELETE` lo habrían modificado o borrado.

### Causa
Todos operaban con `where: { id }` desnudo, y ningún handler contable leía siquiera `event.context.auth`: su única defensa era el middleware que verificaba el JWT.

### Solución
El cliente acotado por empresa inyecta `companyId` en todo `where`, así que un id ajeno simplemente no encuentra fila y el handler responde 404. Verificado en `scripts/aislamiento.sh`, que además comprueba que el registro sigue **intacto** tras el intento: un 404 no basta si el update llegó a tocar la fila.

---

## BUG-014: Claves foráneas que podían cruzar empresas

| | |
|---|---|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Alto |
| **Afecta** | `server/utils/voucherPayload.ts`, `server/api/inventory-assets/index.post.ts`, `server/api/vouchers/duplicate.post.ts` |
| **Fecha** | Agosto 2026 |

### Síntoma
`partyId` y `voucherId` llegaban como números sueltos en el body y se guardaban sin comprobar nada.

### Causa
Es el hueco que la extensión del cliente Prisma **no** puede tapar: solo ve el primer nivel de `where` y `data`, no puede validar un id escalar ni filtrar un `include`.

### Solución
`assertPertenece(db, modelo, id)` resuelve la FK con el cliente acotado antes de guardar. `scripts/check-invariants.ts` comprueba sobre los datos ya guardados que ninguna FK cruce empresas, y puede correr contra producción porque solo lee.

---

## BUG-015: `deleteMany()` sin `where` en el seed

| | |
|---|---|
| **Estado** | 🟢 Resuelto |
| **Severidad** | Crítico |
| **Afecta** | `prisma/seed.ts` |
| **Fecha** | Agosto 2026 |

### Síntoma
Cinco `deleteMany()` sin filtro. Con una empresa borraba la demo; con varias habría arrasado la contabilidad de todos los clientes del sistema.

### Solución
El seed resuelve primero su empresa de demostración por RUC y acota los borrados a ella.
