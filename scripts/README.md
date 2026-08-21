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
