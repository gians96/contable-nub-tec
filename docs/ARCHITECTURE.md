# Arquitectura del Proyecto

## Estructura de Carpetas

```
contable/
├── app/                          # Frontend (Nuxt 4 app directory)
│   ├── app.vue                   # Componente raíz
│   ├── components/               # Componentes UI reutilizables
│   │   ├── Alert.vue
│   │   ├── Badge.vue
│   │   ├── Modal.vue
│   │   ├── Sidebar.vue
│   │   └── StatCard.vue
│   ├── composables/              # Lógica reactiva compartida
│   │   ├── useAuth.ts            # Estado de autenticación
│   │   └── useTaxCalculations.ts # Cálculos tributarios en frontend
│   ├── layouts/                  # Layouts de la app
│   │   ├── auth.vue              # Layout para login (sin sidebar)
│   │   └── default.vue           # Layout principal (sidebar + topbar)
│   ├── middleware/
│   │   └── auth.global.ts        # Redirige a /login; reenvía Cookie en SSR ($fetch /api/auth/me)
│   └── pages/                    # Páginas (file-based routing)
│       ├── login.vue             # Inicio de sesión
│       ├── index.vue             # Dashboard principal
│       ├── comprobantes.vue      # CRUD de comprobantes
│       ├── resumen-mensual.vue   # Resumen 12 meses con pagos
│       ├── cierre-anual.vue      # Cierre anual + Form 710
│       ├── inventario.vue        # Activos fijos e inventario
│       ├── configuracion.vue     # Datos empresa + parámetros tributarios
│       ├── importar-exportar.vue # Import Excel/CSV, Export
│       └── ayuda.vue             # Guía de uso y conceptos tributarios
│
├── server/                       # Backend (Nitro server)
│   ├── api/                      # API Routes (25 endpoints)
│   │   ├── auth/
│   │   │   ├── login.post.ts
│   │   │   ├── logout.post.ts
│   │   │   └── me.get.ts
│   │   ├── dashboard/
│   │   │   └── index.get.ts
│   │   ├── vouchers/
│   │   │   ├── index.get.ts      # Listado con filtros y paginación
│   │   │   ├── index.post.ts     # Crear con cálculo auto de base/IGV
│   │   │   ├── [id].get.ts
│   │   │   ├── [id].put.ts
│   │   │   ├── [id].delete.ts
│   │   │   └── duplicate.post.ts
│   │   ├── parties/
│   │   │   ├── index.get.ts
│   │   │   └── index.post.ts
│   │   ├── monthly-summary/
│   │   │   ├── index.get.ts      # Calcula 12 meses con arrastre IGV
│   │   │   └── update.put.ts     # Registra pagos efectuados
│   │   ├── annual-closure/
│   │   │   ├── index.get.ts      # Genera cierre con tramos RMT
│   │   │   └── update.put.ts
│   │   ├── inventory-assets/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   ├── [id].put.ts
│   │   │   └── [id].delete.ts
│   │   ├── settings/
│   │   │   ├── company.get.ts
│   │   │   ├── company.put.ts
│   │   │   ├── tax-params.get.ts
│   │   │   └── tax-params.put.ts
│   │   ├── export/
│   │   │   └── index.get.ts      # Exportar a Excel/CSV
│   │   └── import/
│   │       └── index.post.ts     # Importar desde Excel/CSV
│   ├── middleware/
│   │   └── auth.ts               # Validación JWT en todas las rutas /api/
│   └── utils/                    # Auto-importados por Nitro
│       ├── prisma.ts             # Singleton PrismaClient con adapter
│       ├── calculations.ts       # Motor de cálculos tributarios
│       └── validators.ts         # Validación de inputs
│
├── prisma/
│   ├── schema.prisma             # Esquema de BD (8 tablas, 10 enums)
│   ├── migrations/               # Migraciones generadas
│   └── seed.ts                   # Datos de ejemplo
│
├── generated/
│   └── prisma/                   # Cliente Prisma generado (gitignored)
│
├── assets/
│   └── css/
│       └── main.css              # Tailwind + clases custom
│
├── prisma.config.ts              # Configuración Prisma 7 (datasource URL)
├── nuxt.config.ts                # Configuración Nuxt
├── .env                          # Variables de entorno (gitignored)
└── package.json
```

## Flujo de Datos

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Browser    │────▶│  Nuxt/Nitro  │────▶│  Prisma ORM  │────▶│ MariaDB  │
│  (Vue SPA)  │◀────│  API Routes  │◀────│  + Adapter   │◀────│          │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────┘
      │                    │
      │ JWT cookie         │ Auto-import utils
      │ Auth middleware     │ (prisma, calculations,
      │ (client-side)      │  validators)
```

## Flujo de autenticación

```
1. POST /api/auth/login  →  bcrypt.compare()  →  jwt.sign()  →  Set-Cookie: auth_token (httpOnly, path /)
2. Cada request /api/*   →  server/middleware/auth.ts  →  jwt.verify()  →  event.context.auth
3. GET /api/auth/me      →  Retorna { id, username } del token (lee cookie auth_token)
4. POST /api/auth/logout →  Borra cookie auth_token
5. Middleware de rutas   →  app/middleware/auth.global.ts llama a /api/auth/me
   - En el cliente, el navegador envía la cookie automáticamente.
   - En SSR (p. ej. F5), $fetch no incluye cookies del cliente por defecto: se usa
     useRequestHeaders(['cookie']) y se pasa como headers a $fetch para que la sesión persista al recargar.
```

## Flujo del Cálculo Tributario

```
Comprobante registrado
        │
        ▼
┌─────────────────────┐
│ calcularBaseEIGV()  │  Total ÷ 1.18 = Base, Base × 0.18 = IGV
│ (si afectoIgv=true) │  (o manual si modoManual=true)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ resumirMes()        │  Agrupa por mes: ventas, compras por destino
│                     │  Clasifica crédito fiscal según destino
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ calcularIGVNetoMes()               │
│ IGV Ventas - IGV Compras (crédito) │
│ + Saldo mes anterior               │
│ Si neto < 0 → saldo a favor        │
│ Si neto > 0 → pago IGV             │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ calcularIRMensualSugerido()        │
│ 1% × Base Ventas del mes           │
│ (pago a cuenta mensual)            │
└─────────┬───────────────────────────┘
          │
          ▼  (al cierre del año)
┌─────────────────────────────────────┐
│ calcularCierreAnual()              │
│ Ventas - Costo - Gastos = Utilidad │
│ Utilidad +/- Ajustes = Renta Neta  │
│ Tramo 1: 10% hasta 15 UIT         │
│ Tramo 2: 29.5% sobre exceso       │
│ - Pagos a cuenta = Saldo           │
└─────────────────────────────────────┘
```

## Convenciones

- **Auto-imports**: Nuxt auto-importa `server/utils/`, `app/composables/`, `app/components/`
- **Naming**: API routes usan kebab-case, modelos PascalCase, tablas snake_case
- **Prisma**: Output personalizado en `generated/prisma/` (gitignored)
- **Cálculos**: Toda la lógica tributaria vive en `server/utils/calculations.ts`
- **Validación**: Solo en boundarios del sistema (API inputs) via `server/utils/validators.ts`
