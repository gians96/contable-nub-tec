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

  if (!body.importeTotal || Number(body.importeTotal) <= 0) {
    errors.push('Importe total debe ser mayor a 0')
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
