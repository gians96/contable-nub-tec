/**
 * Validaciones de entrada para la API.
 */

export function validateVoucherInput(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body.tipoMovimiento || !['VENTA', 'COMPRA'].includes(body.tipoMovimiento)) {
    errors.push('Tipo de movimiento es obligatorio (VENTA o COMPRA)')
  }

  if (!body.destinoTributario) {
    errors.push('Destino tributario es obligatorio')
  }

  // Una nota de crédito resta: se registra en negativo, igual que en el
  // registro de ventas de SUNAT. El resto de comprobantes sigue en positivo.
  const total = Number(body.importeTotal)
  const esNotaCredito = body.tipoComprobante === 'NOTA_CREDITO'

  if (body.importeTotal == null || body.importeTotal === '' || !Number.isFinite(total) || total === 0) {
    errors.push('Importe total es obligatorio y distinto de 0')
  } else if (total < 0 && !esNotaCredito) {
    errors.push('Solo una nota de crédito puede tener importe negativo')
  }

  if (!body.fecha) {
    errors.push('Fecha es obligatoria')
  }

  if (body.destinoTributario === 'ACTIVO_FIJO' && !body.vidaUtilMeses) {
    errors.push('Para Activo Fijo, la vida útil en meses es obligatoria')
  }

  // Validar coherencia: ventas deben tener destino VENTA
  if (body.tipoMovimiento === 'VENTA' && body.destinoTributario !== 'VENTA') {
    errors.push('Una venta debe tener destino tributario = VENTA')
  }

  // Compras no deben tener destino VENTA
  if (body.tipoMovimiento === 'COMPRA' && body.destinoTributario === 'VENTA') {
    errors.push('Una compra no puede tener destino tributario = VENTA')
  }

  if (body.igvPercent != null && body.igvPercent !== '') {
    const tasa = Number(body.igvPercent)
    if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100) {
      errors.push('La tasa de IGV debe estar entre 0 y 100')
    }
  }

  // La detracción es una forma de pago, no un tributo: no puede superar al
  // comprobante ni ir en sentido contrario.
  if (body.detraccion) {
    const porcentaje = Number(body.detraccionPorcentaje)
    const monto = Number(body.detraccionMonto)

    if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
      errors.push('El porcentaje de detracción debe estar entre 0 y 100')
    }

    if (!Number.isFinite(monto) || monto === 0) {
      errors.push('El monto de la detracción es obligatorio y distinto de 0')
    } else if (Number.isFinite(total) && total !== 0) {
      if (Math.abs(monto) > Math.abs(total)) {
        errors.push('La detracción no puede superar el importe total del comprobante')
      }
      if (Math.sign(monto) !== Math.sign(total)) {
        errors.push('La detracción debe tener el mismo signo que el importe total')
      }
    }
  }

  // En modo manual el usuario escribe base e IGV a mano. Sin este control, un
  // comprobante descuadrado desajusta en silencio el resumen mensual y el 0621.
  if (body.modoManual && body.baseImponible != null) {
    const suma = Number(body.baseImponible) + Number(body.igv || 0)
    if (Number.isFinite(total) && Number.isFinite(suma) && Math.abs(round2(suma) - round2(total)) > 0.01) {
      errors.push('En modo manual, base imponible + IGV debe ser igual al importe total')
    }
  }

  return { valid: errors.length === 0, errors }
}

export function validatePartyInput(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body.numeroDocumento) {
    errors.push('Número de documento es obligatorio')
  }

  if (!body.razonSocial) {
    errors.push('Razón social es obligatoria')
  }

  return { valid: errors.length === 0, errors }
}

export function validateInventoryInput(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body.descripcion) {
    errors.push('Descripción es obligatoria')
  }

  if (!body.total || Number(body.total) <= 0) {
    errors.push('Total debe ser mayor a 0')
  }

  if (body.destinoTributario === 'ACTIVO_FIJO' && !body.vidaUtilMeses) {
    errors.push('Para Activo Fijo, la vida útil en meses es obligatoria')
  }

  return { valid: errors.length === 0, errors }
}
