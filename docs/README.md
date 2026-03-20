# ContaPYME — Documentación del Proyecto

> Control tributario y financiero básico para pequeñas empresas bajo el Régimen MYPE Tributario (RMT) de Perú.

## Índice de Documentación

| Documento | Descripción |
|-----------|-------------|
| [TECH-STACK.md](TECH-STACK.md) | Stack tecnológico, versiones y justificación de cada herramienta |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura del proyecto, estructura de carpetas, flujo de datos |
| [SETUP.md](SETUP.md) | Guía de instalación, configuración y despliegue |
| [BUGS.md](BUGS.md) | Registro de bugs encontrados, soluciones aplicadas y pendientes |
| [API.md](API.md) | Referencia de todos los endpoints del API |
| [DATABASE.md](DATABASE.md) | Esquema de base de datos, enums, relaciones |

## ¿Qué es ContaPYME?

Una aplicación web diseñada para que una MYPE peruana pueda:

- **Registrar comprobantes** (facturas, boletas, notas de crédito/débito, recibos de honorarios)
- **Calcular automáticamente** IGV (18%) e IR mensual (1% de ventas netas)
- **Generar resúmenes mensuales** con saldo de IGV arrastrable entre meses
- **Proyectar el cierre anual** bajo los tramos del RMT (10% hasta 15 UIT, 29.5% por encima)
- **Gestionar inventario y activos fijos** con depreciación mensual
- **Importar/Exportar datos** desde Excel y CSV
- **Clasificar gastos** por destino tributario (costo de ventas, gasto administrativo, gasto de venta, activo fijo, no deducible)

## Estado Actual

| Componente | Estado |
|------------|--------|
| Backend (API + lógica tributaria) | ✅ Completo |
| Frontend (9 páginas + componentes) | ✅ Completo |
| Base de datos (esquema + seed) | ✅ Completo |
| Migraciones Prisma 7 | ✅ Funcionando |
| Seed con datos de ejemplo | ✅ Ejecutado |
| Servidor de desarrollo | ⚠️ Bug ESM loader en Windows (ver [BUGS.md](BUGS.md)) |
