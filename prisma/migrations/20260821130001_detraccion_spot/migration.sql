-- Detracciones (SPOT) por comprobante.
--
-- La detracción no altera la base imponible ni el IGV: el comprobante se
-- declara completo en las casillas 100/101 y 107/108 del 0621. Lo que cambia
-- es la caja —el neto que se cobra o se paga— y, en las compras, el periodo
-- desde el que se puede usar el crédito fiscal. Por eso son columnas nuevas y
-- no un descuento sobre `importeTotal`.
--
-- Todos los comprobantes ya registrados quedan con `detraccion = false`, que es
-- lo correcto: hasta ahora no había forma de marcar ninguno.

-- AlterTable
ALTER TABLE `vouchers`
  ADD COLUMN `detraccion` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `detraccionCodigo` VARCHAR(191) NULL,
  ADD COLUMN `detraccionPorcentaje` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `detraccionMonto` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `detraccionConstancia` VARCHAR(191) NULL,
  ADD COLUMN `detraccionFechaDeposito` DATETIME(3) NULL;
