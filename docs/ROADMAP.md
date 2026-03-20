# Próximas implementaciones

Hoja de ruta orientativa: ideas no implementadas aún, para alinear desarrollo y posibles integraciones (IA, MCP, SUNAT).

## Captura inteligente de comprobantes (IA + adjuntos)

**Objetivo:** reducir carga manual al registrar ventas y compras.

### Flujo propuesto

1. El usuario **adjunta** uno o más archivos:
   - **XML** del comprobante electrónico (formato SUNAT / UBL 2.1 cuando aplique), o
   - **Imagen o PDF** (foto del comprobante impreso, captura de pantalla, archivo escaneado).
2. Opcionalmente escribe un **campo de explicación / contexto** (texto libre), por ejemplo:
   - *“Mercadería para reventa (cámaras)”*, *“Útiles de oficina”*, *“Flete de equipos”*, *“Servicio SaaS a cliente X”*.
3. Un **servicio de extracción** (modelo de visión + OCR y/o parser XML) obtiene campos estructurados: RUC emisor/receptor, tipo y serie, correlativo, fechas, líneas, totales, IGV, moneda.
4. El sistema **propone** un borrador de comprobante en la app: tipo (VENTA/COMPRA), partes, montos, y sugiere **destino tributario** y **subcategoría** usando reglas + el contexto del usuario.
5. El usuario **revisa y confirma** antes de guardar (siempre con intervención humana para cumplir responsabilidad tributaria).

### Detalles técnicos a definir

| Área | Opciones / notas |
|------|------------------|
| XML | Parser dedicado UBL-Invoice / notas vinculadas; validar esquema y firma cuando se requiera trazabilidad. |
| Imagen | API de visión (OpenAI, Google, Azure Document Intelligence, etc.) o modelo self-hosted; normalizar DPI y orientación. |
| Clasificación | Combinar heurísticas existentes (`DestinoTributario`, `Subcategoria`) con embeddings o few-shot del proveedor/cliente habitual. |
| Auditoría | Guardar hash del archivo, timestamp y versión del modelo; log de “sugerido por IA” vs. valores editados. |

### Privacidad y cumplimiento

- Tratar RUC, razón social y montos como **datos sensibles** del negocio.
- Definir si el procesamiento es **on-premise**, **VPC** o vía API de terceros y políticas de retención.
- La app seguirá siendo **referencial**; la obligación legal de declarar correctamente sigue siendo del contribuyente y/o su contador.

---

## Integración con MCP (Model Context Protocol)

**Objetivo:** que asistentes (Cursor, Claude, u otros clientes MCP) puedan operar sobre ContaPYME de forma controlada.

### Ideas de herramientas MCP

- `list_vouchers` / `create_voucher` — listar o crear comprobantes con los mismos campos que la API actual.
- `get_monthly_summary` — devolver resumen mensual alineado con `monthly-summary`.
- `attach_and_draft_voucher` — subir archivo (XML/imagen) + texto de contexto y devolver **borrador JSON** para revisión (encaja con la sección anterior).

### Requisitos

- Autenticación segura (token de larga duración o OAuth2 según entorno).
- Rate limiting y permisos por alcance (solo lectura vs. escritura).
- Documentación OpenAPI o descriptores MCP alineados con [API.md](API.md).

---

## Otras mejoras posibles (backlog corto)

- Notificaciones de vencimiento de declaración / pagos.
- Conciliación bancaria simple (import CSV de movimientos).
- Export SUNAT / PLE cuando el producto lo requiera (fuera del alcance actual del MVP).

---

*Última actualización: marzo 2026.*
