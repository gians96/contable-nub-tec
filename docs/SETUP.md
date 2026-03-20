# Guía de Instalación y Configuración

## Requisitos Previos

| Requisito | Versión mínima |
|-----------|---------------|
| Node.js | 20+ |
| Bun | 1.2+ |
| MariaDB o MySQL | 10.0+ / 5.6+ |

## 1. Clonar e instalar dependencias

```bash
git clone <repo-url> contable
cd contable
bun install
```

## 2. Configurar variables de entorno

Crear archivo `.env` en la raíz:

```env
# Conexión a MariaDB/MySQL
DATABASE_URL="mysql://usuario:contraseña@host:3306/nombre_db"

# Secreto para firmar tokens JWT (cambiar en producción)
AUTH_SECRET="un-secreto-seguro-de-produccion"
```

## 3. Generar el cliente Prisma

```bash
bunx --bun prisma generate
```

Esto genera el cliente tipado en `generated/prisma/`.

## 4. Crear las tablas en la base de datos

```bash
bunx --bun prisma migrate dev --name init
```

O si prefieres push directo sin migraciones:

```bash
bunx --bun prisma db push
```

## 5. Cargar datos de ejemplo (opcional)

```bash
bun run prisma/seed.ts
```

Esto crea:
- Usuario admin: `admin` / `admin123`
- Empresa de ejemplo: Nubetec Solutions SAC
- Parámetros tributarios 2024-2026
- 10 clientes/proveedores
- 15 ventas + 21 compras de ejemplo (2025)
- 3 activos fijos

## 6. Iniciar el servidor de desarrollo

```bash
bun run dev
```

La app estará disponible en `http://localhost:3000`.

## Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Servidor de desarrollo con hot reload |
| `bun run build` | Build de producción |
| `bun run preview` | Preview del build de producción |
| `bunx --bun prisma generate` | Regenerar cliente Prisma |
| `bunx --bun prisma migrate dev --name <nombre>` | Crear nueva migración |
| `bunx --bun prisma db push` | Sincronizar schema sin migración |
| `bunx --bun prisma studio` | Abrir GUI de la base de datos |
| `bun run prisma/seed.ts` | Ejecutar seed |

## Notas Importantes

### Flag `--bun` en Prisma
Siempre usar `bunx --bun prisma` en vez de `bunx prisma`. Sin el flag `--bun`, Prisma cae al runtime de Node.js por el shebang del CLI, lo cual puede causar incompatibilidades.

### Prisma 7 y Driver Adapters
Prisma 7 no tiene motor binario Rust. Requiere un driver adapter JavaScript (`@prisma/adapter-mariadb`). La conexión a la base de datos se configura en DOS lugares:
1. **`prisma.config.ts`** → Para comandos CLI (migrations, studio, etc.)
2. **`server/utils/prisma.ts`** → Para runtime (queries desde la app)

### Output personalizado
El cliente Prisma se genera en `generated/prisma/` (no en `node_modules/@prisma/client`). Esto resuelve problemas de bundling con Nitro en Windows.

### Build en Vercel (avisos de Vite / Tailwind)
Si en los logs ves **WARN** de:
- **chunks > 500 kB** — el proyecto ya separa ApexCharts en su chunk y sube `chunkSizeWarningLimit` en `nuxt.config.ts`. No es un fallo de despliegue.
- **@tailwindcss/vite / sourcemap incorrect** — aviso conocido del plugin con Vite 7; `build.sourcemap: false` reduce ruido. **No impide** que el build termine con éxito.

Mientras el comando termine en **Build complete** y exit code 0, Vercel puede publicar la app. Si el deploy **falla**, suele ser otra causa (variables `DATABASE_URL` / `AUTH_SECRET`, Prisma en serverless, etc.).

### Vercel + Prisma + Bun (`@prisma/client does not exist`)
El trazado de dependencias de Nitro (`@vercel/nft`) busca paquetes bajo `node_modules/`. Con el **linker aislado** de Bun a veces no existe `node_modules/@prisma/client` y el build falla.

En este repo:
- **`bunfig.toml`** → `linker = "hoisted"` (instalación tipo npm).
- **`vercel.json`** → `installCommand`: `bun install --linker hoisted`.
- **`package.json`** → `postinstall` y `build` ejecutan **`prisma generate`** antes de Nuxt.
- **`nuxt.config.ts`** → sin `traceInclude` de rutas Prisma (evita forzar rutas que NFT no resuelve).

En el proyecto de Vercel define **`DATABASE_URL`** y **`AUTH_SECRET`** en *Environment Variables* (la app en runtime necesita la URL real; `prisma.config` usa un placeholder solo si falta en el paso de generate).
