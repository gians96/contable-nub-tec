-- Afina el backfill de la tasa de IGV.
--
-- El snapping por proporción (|igv/base*100 - 18| <= 0.5) falla en importes muy
-- pequeños: un comprobante de S/ 0.50 con base 0.42 e IGV 0.08 da 19.05% aunque
-- sea un 18% perfectamente redondeado. La prueba correcta es la inversa:
-- si dividir el total entre el factor reproduce la base guardada, esa era la tasa.

UPDATE `vouchers` SET `igvPercent` = 18.00, `regimenIgv` = 'GENERAL'
WHERE `afectoIgv` = 1
  AND `igvPercent` NOT IN (0.00, 10.00, 18.00)
  AND ROUND(`importeTotal` / 1.18, 2) = `baseImponible`;

UPDATE `vouchers` SET `igvPercent` = 10.00, `regimenIgv` = 'LEY_31556'
WHERE `afectoIgv` = 1
  AND `igvPercent` NOT IN (0.00, 10.00, 18.00)
  AND ROUND(`importeTotal` / 1.10, 2) = `baseImponible`;

UPDATE `inventory_assets` SET `igvPercent` = 18.00, `regimenIgv` = 'GENERAL'
WHERE `igvPercent` NOT IN (0.00, 10.00, 18.00)
  AND ROUND(`total` / 1.18, 2) = `base`;

UPDATE `inventory_assets` SET `igvPercent` = 10.00, `regimenIgv` = 'LEY_31556'
WHERE `igvPercent` NOT IN (0.00, 10.00, 18.00)
  AND ROUND(`total` / 1.10, 2) = `base`;
