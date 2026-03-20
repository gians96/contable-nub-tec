# Contable - Control Tributario MYPE (Perú)

Aplicación web para llevar el control de impuestos de una pequeña empresa bajo el Régimen MYPE Tributario (RMT) en Perú.

## Funcionalidades

- **Dashboard** — Resumen visual del año con gráficos de ventas, compras, IGV e IR
- **Comprobantes** — Registro de ventas y compras con cálculo automático de base imponible e IGV
- **Resumen Mensual** — IGV neto e IR sugerido mes a mes; referencia a casillas 0621; redondeo tipo SUNAT; columnas configurables; registro de pagos (IGV/IR) y total pagado
- **Cierre Anual** — Estimación referencial del IR anual y casillas del Formulario Virtual 710
- **Inventario** — Control de activos fijos con cálculo de depreciación en línea recta
- **Configuración** — Datos de la empresa y parámetros tributarios por año
- **Importar/Exportar** — Descarga en Excel/CSV e importación masiva de comprobantes
- **Ayuda** — Guía tributaria educativa para MYPE
- **Autenticación** — Sesión por cookie JWT (`httpOnly`); el middleware global reenvía cookies en SSR para que **recargar la página no cierre la sesión**

## Documentación

Documentación detallada en la carpeta [`docs/`](docs/README.md) (arquitectura, API, base de datos, bugs y [hoja de ruta](docs/ROADMAP.md)).

## Stack

- **Nuxt 4** (Vue 3) — Frontend y servidor
- **Prisma 7** — ORM
- **MariaDB / MySQL** — Base de datos
- **Tailwind CSS 4.2** — Estilos ([guía Nuxt](https://tailwindcss.com/docs/installation/framework-guides/nuxt))
- **ApexCharts** — Gráficos
- **Bun** — Runtime y package manager

## Requisitos

- [Bun](https://bun.sh/) v1.1+
- MariaDB 10.6+ o MySQL 8+

## Instalación

```bash
bun install
```

## Configuración

Edita el archivo `.env`:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/contable"
AUTH_SECRET="una-clave-secreta-larga-y-aleatoria"
```

## Base de datos

```bash
# Generar cliente Prisma
bunx prisma generate

# Crear/migrar tablas
bunx prisma migrate dev --name init

# Cargar datos de demostración
bun prisma/seed.ts
```

## Desarrollo

```bash
bun run dev
```

Abre la URL que muestre la consola (suele ser http://localhost:3000). En Windows el proyecto fuerza `NITRO_NO_UNIX_SOCKET` desde `nuxt.config.ts` para evitar que el worker de Nitro caiga con *worker exited with code 0* al usar named pipes.

Usuario de demo: `admin` / `admin123`.

## Producción

```bash
bun run build
bun run .output/server/index.mjs
```

## Estructura

```
app/
  assets/css/     → `main.css` (Tailwind v4: @import, @theme, componentes de formulario)
  pages/          → Páginas (dashboard, comprobantes, resumen, etc.)
  components/     → UI (Modal, Badge, Alert, `DashboardCharts.vue` lazy + ApexCharts)
  composables/    → Lógica reutilizable (auth, cálculos)
  layouts/        → Layout con sidebar; `auth.vue` para login centrado
  middleware/     → `auth.global.ts` (cookie en SSR vía `useRequestHeaders`)
server/
  api/            → API REST (vouchers, dashboard, settings, etc.)
  utils/          → Prisma client, cálculos tributarios, validadores
  middleware/     → Autenticación JWT
prisma/
  schema.prisma   → Modelo de datos
  seed.ts         → Datos de demostración
```

## Notas

- **IGV:** el **crédito fiscal** (saldo a favor) ya se arrastraba mes a mes aunque no hubiera comprobantes. Desde **2026**, la app acumula además una **deuda referencial** si el IGV pagado es menor al sugerido (sin arrastrar deuda de años anteriores a 2026). No sustituye el estado de cuenta SUNAT ni los intereses moratorios.
- Los cálculos de IR y IGV son **referenciales**. El cálculo oficial lo realiza SUNAT y/o tu contador.
- RMT: 10% hasta 15 UIT, 29.5% sobre el exceso. Pago a cuenta mensual: 1%.
- IGV estándar: 18% sobre el valor de venta.
