-- Cuánto del pago del mes salió de la cuenta de detracciones del Banco de la
-- Nación.
--
-- No es un pago adicional: ya está contenido en `pagoIgvEfectuado` y
-- `pagoIrEfectuado`. Solo registra el origen del dinero, que es lo que permite
-- llevar el saldo del fondo: abona lo detraído en las ventas y carga lo que se
-- va usando para pagar tributos.
--
-- Los meses ya guardados quedan en 0, que es lo correcto: hasta ahora no había
-- forma de decir que un pago se hizo con esos fondos.

-- AlterTable
ALTER TABLE `monthly_summaries`
  ADD COLUMN `pagoConDetraccion` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
