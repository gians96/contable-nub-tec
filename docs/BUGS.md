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
