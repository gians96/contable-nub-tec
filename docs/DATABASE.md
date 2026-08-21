# Esquema de Base de Datos

## Diagrama de Relaciones

```
┌─────────┐     ┌───────────┐     ┌────────────────┐
│  User   │     │   Party   │────▶│    Voucher     │
└─────────┘     └───────────┘     └───────┬────────┘
                                          │
                                          ▼
                                  ┌────────────────┐
                                  │ InventoryAsset │
                                  └────────────────┘

┌─────────┐     ┌────────────┐
│ Company │◀────│ Membership │────▶ User
└────┬────┘     └────────────┘
     │  (companyId en TODAS las tablas contables)
     ▼
  Party · Voucher · InventoryAsset · TaxParameter
  MonthlySummary · AnnualClosure · AuditLog

┌─────────────────┐
│ AnnualClosure   │
└─────────────────┘
```

## Tablas

### `users`
Usuario del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK, auto) | — |
| username | VARCHAR (unique) | Nombre de usuario |
| passwordHash | VARCHAR | Hash bcrypt |
| nombre | VARCHAR (null) | Nombre para mostrar |
| role | ENUM(ADMIN, USUARIO) | ADMIN gestiona usuarios |
| activo | BOOLEAN | Un usuario inactivo no puede iniciar sesión |
| createdAt | DATETIME | — |
| updatedAt | DATETIME | — |

### `companies`
Cada fila es un **tenant**. Hereda la tabla `company_settings`, que era una fila
única leída con `findFirst()` sin `where`.

Además de RUC, razón social, nombre comercial, dirección y moneda:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| estado | ENUM(ACTIVA, SUSPENDIDA) | Suspendida: se lee y exporta, no se escribe |
| plan | ENUM(FREE, PRO) | Plan contratado |
| limiteVouchersAnual | INT? | Cupo de comprobantes por año. `null` = sin límite |
| limiteUsuarios | INT? | Cupo de miembros activos |

### `memberships`
Pertenencia de un usuario a una empresa, con su rol allí. `@@unique([userId, companyId])`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| userId / companyId | INT (FK) | Cascade en ambos lados |
| role | ENUM(OWNER, ADMIN, CONTADOR, LECTOR) | Rol **dentro de esa empresa** |
| activo | BOOLEAN | Una membresía inactiva no da acceso |

### `audit_logs`
Rastro de escrituras. `datos` guarda JSON serializado como texto para no depender
del soporte de `Json` del adapter de MariaDB.

### `company_settings` (renombrada)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | — |
| ruc | VARCHAR | RUC de la empresa |
| razonSocial | VARCHAR | Razón social |
| nombreComercial | VARCHAR? | Nombre comercial |
| direccion | VARCHAR? | Dirección fiscal |
| moneda | VARCHAR | Default: `PEN` |

### `tax_parameters`
Parámetros tributarios por año. Un registro por año.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | — |
| year | INT (unique) | Año fiscal |
| igvPercent | DECIMAL(5,2) | Tasa de IGV por defecto del año (default: 18%) |
| irMonthlyPercent | DECIMAL(5,2) | Pago a cuenta IR mensual (default: 1%) |
| uit | DECIMAL(10,2) | Valor de la UIT del año |
| irAnnualTramo1Limit | DECIMAL(5,2) | Límite Tramo 1 en UITs (default: 15) |
| irAnnualTramo1Rate | DECIMAL(5,2) | Tasa Tramo 1 (default: 10%) |
| irAnnualTramo2Rate | DECIMAL(5,2) | Tasa Tramo 2 (default: 29.5%) |
| irAnnualFlatRate | DECIMAL(5,2) | Tasa anual plana del RG (default: 29.5%) |
| regimen | ENUM(NRUS, RER, RMT, RG) | Régimen vigente en el año (default: RMT) |
| nrusCategoria | INT | Categoría del NRUS (1 o 2) |
| nrusCuotaCat1 / nrusCuotaCat2 | DECIMAL(10,2) | Cuota fija mensual (20 / 50) |
| nrusLimiteCat1 / nrusLimiteCat2 | DECIMAL(12,2) | Límite de ingresos o compras (5 000 / 8 000) |
| rerRate | DECIMAL(5,2) | Renta mensual definitiva del RER (1.5%) |
| rmtUmbralUit | DECIMAL(10,2) | Umbral en UIT para cambiar de tasa en RMT (300) |
| rmtLimiteRegimenUit | DECIMAL(10,2) | Tope de ingresos del RMT en UIT (1 700) |
| pagoCuentaMinRate | DECIMAL(5,2) | Tasa mínima del pago a cuenta (1.5%) |
| coeficienteManual | DECIMAL(8,6)? | Override del coeficiente; null = se calcula del ejercicio anterior |

El régimen vive aquí y no en una tabla propia porque sería 1:1 con esta y
duplicaría la consulta en los cinco endpoints que ya la leen.

### `parties`
Clientes y proveedores.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | — |
| tipoDocumento | ENUM | RUC, DNI, CE, OTRO |
| numeroDocumento | VARCHAR | Número del documento |
| razonSocial | VARCHAR | Nombre o razón social |
| direccion | VARCHAR? | — |
| email | VARCHAR? | — |
| telefono | VARCHAR? | — |

**Unique:** `(tipoDocumento, numeroDocumento)`

### `vouchers`
Comprobantes de venta y compra.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | — |
| year, month | INT | Año y mes del comprobante |
| fecha | DATETIME | Fecha de emisión |
| tipoMovimiento | ENUM | VENTA o COMPRA |
| tipoComprobante | ENUM | FACTURA, BOLETA, NOTA_CREDITO, etc. |
| serie, numero | VARCHAR? | Serie y número del comprobante |
| partyId | INT? (FK) | Relación con Party |
| rucDni | VARCHAR? | RUC/DNI directo (si no hay Party) |
| razonSocial | VARCHAR? | Razón social directa |
| afectoIgv | BOOLEAN | ¿Gravado con IGV? |
| igvPercent | DECIMAL(5,2) | Tasa aplicada a **este** comprobante (default: 18%) |
| regimenIgv | ENUM(GENERAL, LEY_31556, EXONERADO, INAFECTO) | Decide a qué casillas del 0621 va el importe |
| importeTotal | DECIMAL(12,2) | Monto total |
| baseImponible | DECIMAL(12,2) | Base sin IGV (calculada o manual) |
| igv | DECIMAL(12,2) | Monto del IGV (calculado o manual) |
| modoManual | BOOLEAN | Si true, no se auto-calcula base/IGV |
| medioPago | ENUM | EFECTIVO, TRANSFERENCIA, TARJETA, etc. |
| estadoPago | ENUM | PAGADO, PENDIENTE, PARCIAL |
| destinoTributario | ENUM | VENTA, COSTO_VENTAS, GASTO_ADMIN, etc. |
| subcategoria | ENUM | SAAS, HOSTING, SOFTWARE, etc. |
| deducibleIr | BOOLEAN | ¿Es deducible para IR? |
| creditoFiscalIgv | BOOLEAN | ¿Da derecho a crédito fiscal? |
| inventarioFinal | BOOLEAN | ¿Es inventario final? |
| activoFijo | BOOLEAN | ¿Es activo fijo? |
| vidaUtilMeses | INT? | Vida útil en meses (para deprec.) |
| observacion | TEXT? | Notas |

**Índices:** `(year, month)`, `(tipoMovimiento)`, `(destinoTributario)`

### `inventory_assets`
Inventario y activos fijos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT (PK) | — |
| voucherId | INT? (FK) | Comprobante asociado |
| year | INT | — |
| fecha | DATETIME | Fecha de adquisición |
| comprobante | VARCHAR? | Referencia del comprobante |
| descripcion | VARCHAR | Descripción del activo |
| categoria | ENUM | MERCADERIA, SERVIDOR, LAPTOP, etc. |
| base | DECIMAL(12,2) | Valor sin IGV |
| igv | DECIMAL(12,2) | IGV |
| total | DECIMAL(12,2) | Valor total |
| destinoTributario | ENUM | — |
| estadoCierre | ENUM | EN_USO, VENDIDO, DADO_BAJA, INVENTARIO_FINAL |
| vidaUtilMeses | INT? | — |
| depreciacionMensual | DECIMAL(12,2)? | Cuota mensual de depreciación |
| observaciones | TEXT? | — |

### `monthly_summaries`
Resumen tributario mensual (1 por mes/año).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| year, month | INT (unique pair) | Periodo |
| baseVentas | DECIMAL | Base imponible de ventas |
| igvVentas | DECIMAL | IGV de ventas |
| totalVentas | DECIMAL | Total facturado |
| baseComprasCreditoFiscal | DECIMAL | Base de compras con crédito fiscal |
| igvComprasCreditoFiscal | DECIMAL | IGV de compras deducible |
| costoVentas | DECIMAL | Compras clasificadas como costo |
| gastoAdministracion | DECIMAL | Gastos administrativos |
| gastoVentas | DECIMAL | Gastos de venta |
| activoFijo | DECIMAL | Compras de activo fijo |
| comprasNoDeducibles | DECIMAL | Compras no deducibles |
| igvNetoMes | DECIMAL | IGV ventas - IGV compras |
| saldoIgvMesAnterior | DECIMAL | Saldo IGV del mes anterior |
| saldoIgvMes | DECIMAL | Saldo IGV resultante |
| pagoIrSugerido | DECIMAL | 1% × base ventas |
| pagoIrEfectuado | DECIMAL | Pago real de IR |
| pagoIgvEfectuado | DECIMAL | Pago real de IGV |
| pagoTotalSugerido | DECIMAL | Sugerido total (IGV + IR) |
| pagoTotalEfectuado | DECIMAL | Real total pagado |

### `annual_closures`
Cierre anual (1 por año).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| year | INT (unique) | Año fiscal |
| ventasNetas | DECIMAL | Total ventas netas del año |
| costoVentas | DECIMAL | Total costo de ventas |
| gastosVentas | DECIMAL | Total gastos de venta |
| gastosAdministracion | DECIMAL | Total gastos admin |
| otrosIngresos | DECIMAL | Ingreso extraordinario (manual) |
| otrosGastos | DECIMAL | Gasto extraordinario (manual) |
| utilidadContable | DECIMAL | Ventas - Costos - Gastos |
| adiciones | DECIMAL | Ajustes positivos (manual) |
| deducciones | DECIMAL | Ajustes negativos (manual) |
| rentaNetaImponible | DECIMAL | Utilidad + Adiciones - Deducciones |
| pagosCuentaAcumulados | DECIMAL | Suma de pagos a cuenta IR del año |
| retenciones | DECIMAL | Retenciones de terceros |
| saldoFavorAnterior | DECIMAL | Saldo a favor de años previos |
| impuestoAnual | DECIMAL | IR calculado por tramos RMT |
| saldoPorPagar | DECIMAL | IR - pagos a cuenta |
| saldoAFavor | DECIMAL | Si pagos > IR |

## Enums

| Enum | Valores |
|------|---------|
| TipoMovimiento | VENTA, COMPRA |
| TipoComprobante | FACTURA, BOLETA, NOTA_CREDITO, NOTA_DEBITO, RECIBO_HONORARIOS, TICKET, OTRO |
| DestinoTributario | VENTA, COSTO_VENTAS, GASTO_ADMIN, GASTO_VENTA, ACTIVO_FIJO, NO_DEDUCIBLE |
| Subcategoria | SAAS, FACTURACION_ELECTRONICA, HOSTING, SOFTWARE, CAMARAS, PRODUCTO, FLETE, MOVILIDAD, SERVIDOR, INTERNET, UTILES, EQUIPO_PRUEBAS, LICENCIA, DOMINIO, OTRO |
| MedioPago | EFECTIVO, TRANSFERENCIA, TARJETA, DEPOSITO, CHEQUE, OTRO |
| EstadoPago | PAGADO, PENDIENTE, PARCIAL |
| TipoDocumento | RUC, DNI, CE, OTRO |
| CategoriaInventario | MERCADERIA, SERVIDOR, TICKETERA, LECTOR, LAPTOP, IMPRESORA, CAMARA, OTRO_EQUIPO |
| EstadoCierre | EN_USO, VENDIDO, DADO_BAJA, INVENTARIO_FINAL |
