-- Tasa de IGV por comprobante.
-- `igvPercent` gobierna la aritmética; `regimenIgv` gobierna a qué casilla del
-- Formulario Virtual 0621 va el importe (100/101 y 107/108 para el general,
-- 154/155 y 156/157 para la Ley 31556).

-- AlterTable
ALTER TABLE `vouchers`
  ADD COLUMN `igvPercent` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
  ADD COLUMN `regimenIgv` ENUM('GENERAL', 'LEY_31556', 'EXONERADO', 'INAFECTO') NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE `inventory_assets`
  ADD COLUMN `igvPercent` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
  ADD COLUMN `regimenIgv` ENUM('GENERAL', 'LEY_31556', 'EXONERADO', 'INAFECTO') NOT NULL DEFAULT 'GENERAL';

-- Backfill: la tasa real se deriva de los importes ya registrados.
-- El snapping con tolerancia de 0.5 pp evita tasas basura (18.01, 9.98) nacidas
-- del redondeo a 2 decimales en importes pequeños.
UPDATE `vouchers` SET `igvPercent` = CASE
  WHEN `afectoIgv` = 0 OR `igv` = 0 OR `baseImponible` = 0 THEN 0.00
  WHEN ABS(`igv` / `baseImponible` * 100 - 18) <= 0.5 THEN 18.00
  WHEN ABS(`igv` / `baseImponible` * 100 - 10) <= 0.5 THEN 10.00
  ELSE ROUND(`igv` / `baseImponible` * 100, 2)
END;

UPDATE `vouchers` SET `regimenIgv` = CASE
  WHEN `afectoIgv` = 0 OR `igvPercent` = 0 THEN 'EXONERADO'
  WHEN `igvPercent` = 10.00 THEN 'LEY_31556'
  ELSE 'GENERAL'
END;

UPDATE `inventory_assets` SET `igvPercent` = CASE
  WHEN `igv` = 0 OR `base` = 0 THEN 0.00
  WHEN ABS(`igv` / `base` * 100 - 18) <= 0.5 THEN 18.00
  WHEN ABS(`igv` / `base` * 100 - 10) <= 0.5 THEN 10.00
  ELSE ROUND(`igv` / `base` * 100, 2)
END;

UPDATE `inventory_assets` SET `regimenIgv` = CASE
  WHEN `igvPercent` = 0 THEN 'EXONERADO'
  WHEN `igvPercent` = 10.00 THEN 'LEY_31556'
  ELSE 'GENERAL'
END;
