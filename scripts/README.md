# Scripts

## `importar-sunat.ts` — carga de la propuesta SIRE

Importa los archivos de propuesta del Registro de Ventas y Compras de SUNAT a
los comprobantes de una empresa. Entiende su juego de columnas, las notas de
crédito en negativo, los comprobantes dados de baja y los exports en los que los
datos salen desplazados una columna respecto de la cabecera.

**Sin `--apply` no escribe nada**: imprime lo que haría, con el detalle por
periodo y los avisos. Ejecuta siempre el ensayo primero.

```bash
bun scripts/importar-sunat.ts --ruc 10765096133 ventas-compras.xlsx        # ensayo
bun scripts/importar-sunat.ts --ruc 10765096133 ventas-compras.xlsx --apply
```

Es idempotente: no duplica un comprobante ya registrado del mismo emisor.
Con `--actualizar` reescribe los importes y la detracción de los que ya existan
—útil si SUNAT corrige la propuesta—, sin tocar su clasificación tributaria.

Dos decisiones a tener presentes: el importe total se reconstruye como base +
IGV en vez de copiar «Total CP» (que incluye ICBPER, que la aplicación no
modela; la diferencia queda anotada en la observación), y los comprobantes
entran en `modoManual` para conservar la base y el IGV que SUNAT ya tiene
declarados. La tabla `CLASIFICACION_COMPRAS`, dentro del script, asigna destino
tributario por RUC de proveedor; lo que no esté ahí entra como gasto
administrativo.

## `respaldo-json.ts` — copia de los datos

Vuelca todas las tablas a un JSON. No sustituye a `mysqldump` —no guarda el
esquema— pero permite reconstruir los datos si una migración sale mal, y no
necesita el cliente de MySQL ni sacar la contraseña del entorno.

```bash
bun scripts/respaldo-json.ts /ruta/a/carpeta
```

## `inspect-estado.ts` — radiografía de una empresa

Lista comprobantes por periodo con el IGV del mes, las detracciones y los
parámetros tributarios. **Solo lee**: se puede correr contra producción.

```bash
bun scripts/inspect-estado.ts 10765096133
```

# Scripts de verificación

## `aislamiento.sh` — aislamiento entre empresas

Comprueba de punta a punta que una empresa no puede leer ni escribir datos de
otra: accesos directos por id, agregados, exportación, roles, cookie manipulada
y empresa suspendida.

**Solo contra una base desechable.** Crea empresas, comprobantes y usuarios de
prueba; ejecutarlo contra producción ensuciaría la contabilidad real.

```bash
# 1. copia de la base
mysqldump -h HOST -P PUERTO -u USUARIO --single-transaction contable > /tmp/copia.sql
mysql -h HOST -P PUERTO -u USUARIO -e "DROP DATABASE IF EXISTS contable_test; CREATE DATABASE contable_test;"
mysql -h HOST -P PUERTO -u USUARIO contable_test < /tmp/copia.sql

# 2. servidor apuntando a la copia
DATABASE_URL='mysql://usuario:clave@host:puerto/contable_test' bunx nuxi dev --port 3001

# 3. pruebas
bash scripts/aislamiento.sh
```

## `check-invariants.ts` — coherencia de tenants

Detecta filas cuyas claves foráneas cruzan empresas. Es el único chequeo que
cubre el hueco de `include` y `connect`, que la extensión del cliente Prisma no
puede filtrar. **Este sí puede correr contra producción**: solo lee.

```bash
bun scripts/check-invariants.ts
```

## `check-tenant-schema.ts` — modelos sin empresa

Falla si algún modelo nuevo del schema olvida declarar `companyId`. Evita que
dentro de seis meses alguien añada una tabla sin aislamiento y nadie se entere.

```bash
bun scripts/check-tenant-schema.ts
```
