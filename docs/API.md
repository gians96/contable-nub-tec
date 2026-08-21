# Referencia de API

Todas las rutas requieren autenticación (cookie `auth_token` con JWT), excepto
`POST /api/auth/login` y `POST /api/auth/logout`, que son las únicas públicas.

**Empresa activa.** Toda ruta contable opera sobre la empresa que indica la
cookie `cp_company`, validada contra `memberships` en cada petición. Si la cookie
falta, apunta a una empresa ajena o a una membresía inactiva, se cae de forma
determinista a la primera empresa del usuario — **nunca a una que no sea suya**.
Sin ninguna membresía: `409 NO_COMPANY`.

La cookie solo se escribe donde hay una respuesta que el navegador ve
(`login`, `POST /api/session/company`, `POST /api/companies`); el middleware no
la toca porque en SSR su `Set-Cookie` no llegaría al cliente.

**Roles.** `LECTOR` recibe `403` en cualquier método distinto de GET/HEAD, y una
empresa `SUSPENDIDA` también — salvo `/api/export`, para que siempre pueda sacar
su contabilidad. `/api/users` exige `OWNER` o `ADMIN`; `/api/platform/**` exige
`platformRole = SUPERADMIN`, verificado releyendo el usuario de la base (los JWT
vigentes duran 7 días y no traen rol).

## Autenticación

### `POST /api/auth/login`
Login con credenciales. Setea cookie httpOnly.

**Body:**
```json
{ "username": "admin o tu@correo.com", "password": "…" }
```

**Response:** `{ "id": 1, "username": "admin" }`

### `POST /api/auth/logout`
Elimina la cookie de sesión.

### `GET /api/auth/me`
Retorna el usuario actual desde el token.

**Response:** `{ "id": 1, "username": "admin" }`

---

### `GET|POST /api/companies`
`GET` lista las empresas del usuario con su rol. `POST` crea una en autoservicio:
quien la crea queda `OWNER` y la sesión pasa a ella. Valida RUC de 11 dígitos y
rechaza duplicados.

### `POST /api/session/company`
`{ companyId }`. Fija la empresa activa. `403` si el usuario no pertenece a ella
(salvo superadmin).

### `GET /api/audit`
Registro de auditoría de la empresa activa. Filtros `entidad`, `accion`,
`userId`, paginado. Exige `OWNER` o `ADMIN`.

### `GET /api/platform/companies` · `PUT /api/platform/companies/:id`
Todas las empresas con su número de usuarios y comprobantes; permite cambiar
`estado`, `plan` y cupos. Solo superadmin.

### `GET /api/platform/users` · `PUT /api/platform/users/:id`
Cuentas de la plataforma; permite activar, desactivar y promover a superadmin.
Bloquea quedarse sin ningún superadmin activo.

---

### `POST /api/auth/change-password`

Cambia la contraseña del usuario de la sesión.

```json
{ "passwordActual": "…", "passwordNueva": "mínimo 8 caracteres" }
```

`401` si falta sesión o la contraseña actual es incorrecta. El token sigue siendo válido: identifica al usuario, no a la contraseña.

---

## Usuarios (solo ADMIN)

`/api/users` gestiona **membresías de la empresa activa**, no cuentas globales.

### `GET /api/users`
Miembros de la empresa activa. Nunca devuelve `passwordHash`.

### `POST /api/users`
`{ username, nombre?, role, password?, vincularExistente? }`. Si el usuario no
existe lo crea con una contraseña temporal que se devuelve **una sola vez**. Si
ya existe responde `409 USUARIO_EXISTE`; repetir con `vincularExistente: true` le
da acceso a esta empresa conservando su contraseña.

### `PUT /api/users/:id`
`{ role?, activo? }` sobre la membresía. `400` si dejaría la empresa sin ningún
`OWNER` activo.

### `DELETE /api/users/:id`
Quita la membresía; la cuenta sigue existiendo porque puede pertenecer a otras
empresas. Borrar la cuenta es cosa de `/api/platform/users`.

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

**Importes negativos:** solo se admiten con `tipoComprobante = NOTA_CREDITO`, que
es como el registro de ventas de SUNAT representa una anulación. `importeTotal`
nunca puede ser 0.

**Detracción (SPOT).** Opcional; no altera `baseImponible` ni `igv`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `detraccion` | boolean | Activa el resto de campos |
| `detraccionCodigo` | string? | Código del anexo (ej. `037`) |
| `detraccionPorcentaje` | number | 0 < tasa ≤ 100 |
| `detraccionMonto` | number | Distinto de 0, mismo signo que `importeTotal` y no mayor en valor absoluto. Si no se envía, se calcula desde el porcentaje |
| `detraccionConstancia` | string? | Nº de constancia de depósito |
| `detraccionFechaDeposito` | string? | Fecha ISO del depósito |

`POST /api/vouchers/duplicate` hereda código y tasa, pero **no** la constancia ni
la fecha de depósito: identifican un depósito concreto.

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
  "pagoIrEfectuado": 800.00,
  "pagoConDetraccion": 900.00
}
```

`pagoConDetraccion` es la parte de ese pago que salió de la cuenta de
detracciones del Banco de la Nación. No es un importe aparte: se rechaza con
400 si supera `pagoIgvEfectuado + pagoIrEfectuado`.

`GET /api/monthly-summary` devuelve, además de cada mes,
`detraccionFondoApertura` (saldo heredado de años anteriores) y
`detraccionFondoSaldo` (saldo al cerrar el año consultado); y por mes,
`detraccionFondoInicio`, `detraccionFondoCierre` y `pagoConDetraccion`.

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

### `GET /api/settings/context`

Empresa, régimen y parámetros del año en una sola llamada. Lo consume el header del layout.

```json
{
  "year": 2026,
  "company": { "ruc": "…", "razonSocial": "…", "nombreComercial": "…", "direccion": "…", "moneda": "PEN" },
  "regimen": "RMT",
  "regimenSpec": { "label": "MYPE Tributario (RMT)", "aplicaIgv": true, "aplicaDjAnual": true, "…": "…" },
  "igvPercent": 18,
  "uit": 5350
}
```

---

## Import/Export

### `GET /api/export`
Exportar comprobantes a Excel o CSV.

**Query params:** `year`, `format` (`xlsx` | `csv`)

Además de los campos del comprobante, la exportación incluye las columnas de
detracción (`Detracción`, `Cód. Detracción`, `% Detracción`, `Monto Detracción`,
`Constancia Detracción`, `Fecha Depósito Detracción`) y `Neto Cobrado/Pagado`.

### `POST /api/import`
Importar comprobantes desde archivo Excel o CSV.

**Body:** `multipart/form-data` con archivo.

Espera el mismo juego de columnas que produce `GET /api/export`, detracción
incluida. Acepta importes negativos únicamente en filas cuyo `Tipo Comprobante`
sea `NOTA_CREDITO`.

Para los archivos de propuesta del **SIRE de SUNAT**, que traen otro juego de
columnas, usa `scripts/importar-sunat.ts` (ver [`scripts/README.md`](../scripts/README.md)).
