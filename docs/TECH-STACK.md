# Stack Tecnológico

## Runtime y Package Manager

| Herramienta | Versión | Rol |
|-------------|---------|-----|
| **Bun** | 1.2.19 | Package manager, `bun run dev`, y ejecución del seed (`bun prisma/seed.ts`) |
| **Node.js** | 22.22.1 | Runtime del servidor Nuxt/Nitro |

## Framework

| Paquete | Versión | Rol |
|---------|---------|-----|
| **Nuxt** | 4.4.2 | Framework fullstack (SSR + API routes) |
| **Vue** | 3.5.30 | Motor reactivo del frontend |
| **Vue Router** | 5.0.3 | Enrutamiento SPA |
| **Nitro** | (incluido en Nuxt) | Servidor HTTP, API routes, middleware |

## Base de Datos

| Paquete | Versión | Rol |
|---------|---------|-----|
| **MariaDB** | Remota | Base de datos relacional (compatible MySQL) |
| **Prisma** | 7.5.0 | ORM y migraciones |
| **@prisma/client** | 7.5.0 | Cliente generado para queries tipadas |
| **@prisma/adapter-mariadb** | 7.5.0 | Driver adapter nativo (requerido por Prisma 7) |

### ¿Por qué Prisma 7?

Prisma 7 elimina el motor binario Rust. Ahora usa **driver adapters** nativos de JavaScript:
- Menor tamaño de bundle
- Sin binarios nativos
- Mejor compatibilidad con edge/serverless
- **Requiere** `@prisma/adapter-mariadb` para MySQL/MariaDB
- **No soporta** `url` en el schema — la URL de conexión va en `prisma.config.ts`

## CSS y UI

| Paquete | Versión | Rol |
|---------|---------|-----|
| **Tailwind CSS** | 4.2.x | Utilidades con plugin Vite oficial [`@tailwindcss/vite`](https://tailwindcss.com/docs/installation/framework-guides/nuxt) |
| **@tailwindcss/vite** | 4.2.x | Integración Tailwind 4 + Nuxt (sin `@nuxtjs/tailwindcss`) |

No se usan librerías de componentes externas. Los componentes UI son custom:
- `Modal.vue`, `Badge.vue`, `Alert.vue`, `StatCard.vue`, `Sidebar.vue`
- Estilos base y componentes en `app/assets/css/main.css` (`@import "tailwindcss"`, `@theme`, `.input-field`, `.card`, etc.)

## Gráficos

| Paquete | Versión | Rol |
|---------|---------|-----|
| **ApexCharts** | 5.10.4 | Motor de gráficos |
| **vue3-apexcharts** | 1.11.1 | Wrapper Vue 3 para ApexCharts |

Usado en el Dashboard para 4 visualizaciones:
1. Ventas vs Compras (barras)
2. IGV neto mensual (línea)
3. Distribución de gastos (donut)
4. IR acumulado (área)

## Autenticación

| Paquete | Versión | Rol |
|---------|---------|-----|
| **jsonwebtoken** | 9.0.3 | Generación y verificación de JWT |
| **bcryptjs** | 3.0.3 | Hash de contraseñas |

- Token JWT almacenado en cookie `httpOnly`
- Middleware de servidor valida token en todas las rutas `/api/` (excepto `/api/auth/login`)
- Secret configurable vía `AUTH_SECRET` en `.env`

## Import/Export

| Paquete | Versión | Rol |
|---------|---------|-----|
| **xlsx** | 0.18.5 | Lectura/escritura de archivos Excel |
| **csv-parse** | 6.2.1 | Parser de archivos CSV |
| **csv-stringify** | 6.7.0 | Generador de archivos CSV |

## Dev Dependencies

| Paquete | Versión | Rol |
|---------|---------|-----|
| **@types/bcryptjs** | 3.0.0 | Tipos para bcryptjs |
| **@types/jsonwebtoken** | 9.0.10 | Tipos para jsonwebtoken |
| **TypeScript** | 5.9.3 | Tipado estático (incluido por Nuxt) |

## Infraestructura

| Servicio | Detalle |
|----------|---------|
| **Servidor** | Dokploy (VPS) |
| **Base de datos** | MariaDB remota en `161.132.53.113:3308` |
| **Despliegue** | Pendiente de configurar |
