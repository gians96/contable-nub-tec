# Referencia de API

Todas las rutas requieren autenticación (cookie `auth_token` con JWT), excepto `POST /api/auth/login`.

## Autenticación

### `POST /api/auth/login`
Login con credenciales. Setea cookie httpOnly.

**Body:**
```json
{ "username": "admin", "password": "admin123" }
```

**Response:** `{ "id": 1, "username": "admin" }`

### `POST /api/auth/logout`
Elimina la cookie de sesión.

### `GET /api/auth/me`
Retorna el usuario actual desde el token.

**Response:** `{ "id": 1, "username": "admin" }`

---

## Comprobantes (Vouchers)

### `GET /api/vouchers`
Listado con filtros y paginación.

**Query params:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `year` | number | año actual | Filtrar por año |
| `month` | number | — | Filtrar por mes (1-12) |
| `tipoMovimiento` | string | — | `VENTA` o `COMPRA` |
| `destinoTributario` | string | — | Enum DestinoTributario |
| `page` | number | 1 | Página |
| `limit` | number | 50 | Items por página |

### `POST /api/vouchers`
Crear comprobante. Calcula automáticamente `baseImponible` e `igv` a partir de `importeTotal` (si `afectoIgv=true` y `modoManual=false`).

### `GET /api/vouchers/:id`
Detalle de un comprobante.

### `PUT /api/vouchers/:id`
Actualizar comprobante.

### `DELETE /api/vouchers/:id`
Eliminar comprobante.

### `POST /api/vouchers/duplicate`
Duplicar un comprobante existente.

**Body:** `{ "id": 123 }`

---

## Dashboard

### `GET /api/dashboard`
Datos para el dashboard: totales del mes actual + datos para 4 gráficos.

**Query params:** `year` (default: año actual)

---

## Resumen Mensual

### `GET /api/monthly-summary`
Calcula los 12 meses del año con arrastre de **saldo a favor** (crédito fiscal) mes a mes, incluso en meses sin comprobantes.

**Respuesta (campos relevantes):**
- `igvDebtAccrualFromYear` — año desde el cual aplica la lógica de deuda acumulada (2026).
- `igvDebtAccrualActive` — `true` si `year >= igvDebtAccrualFromYear`.
- Por cada mes en `summaries`:
  - `igvNetoMes` — IGV resultante del **período** (casilla 140 del mes; débito − crédito ± saldo a favor anterior).
  - `igvSugeridoPagoTotal` — desde 2026: deuda IGV arrastrada al inicio del mes + IGV a pagar del período (sugerencia antes de registrar pago). Años anteriores coincide con el IGV del período si aplica.
  - `igvDeudaInicioMes` / `igvDeudaCierreMes` — deuda por IGV no pagado (solo referencial en app); en años &lt; 2026 van en 0. Enero 2026 no arrastra deuda de 2025; entre años ≥ 2026 la deuda de diciembre se abre en enero del año siguiente.

**Query params:** `year` (default: año actual)

### `PUT /api/monthly-summary/update`
Registra pagos efectuados (IGV e IR) para un mes.

**Body:**
```json
{
  "year": 2025,
  "month": 3,
  "pagoIgvEfectuado": 1500.00,
  "pagoIrEfectuado": 800.00
}
```

---

## Cierre Anual

### `GET /api/annual-closure`
Genera el cierre anual con cálculo de IR por tramos RMT.

**Query params:** `year` (default: año actual)

### `PUT /api/annual-closure/update`
Guarda ajustes manuales del cierre (otros ingresos/gastos, adiciones, deducciones).

---

## Inventario y Activos Fijos

### `GET /api/inventory-assets`
Lista activos fijos.

**Query params:** `year` (default: año actual)

### `POST /api/inventory-assets`
Registrar nuevo activo.

### `PUT /api/inventory-assets/:id`
Actualizar estado de activo.

### `DELETE /api/inventory-assets/:id`
Eliminar activo.

---

## Clientes y Proveedores

### `GET /api/parties`
Buscar por nombre o número de documento.

**Query params:** `search` (string)

### `POST /api/parties`
Crear nuevo cliente/proveedor.

---

## Configuración

### `GET /api/settings/company`
Datos de la empresa.

### `PUT /api/settings/company`
Actualizar datos de empresa.

### `GET /api/settings/tax-params`
Parámetros tributarios del año.

**Query params:** `year`

### `PUT /api/settings/tax-params`
Actualizar parámetros (IGV%, IR%, UIT, tramos).

---

## Import/Export

### `GET /api/export`
Exportar comprobantes a Excel o CSV.

**Query params:** `year`, `format` (`xlsx` | `csv`)

### `POST /api/import`
Importar comprobantes desde archivo Excel o CSV.

**Body:** `multipart/form-data` con archivo.
