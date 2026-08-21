-- Multi-tenant, parte 2: companyId en las seis tablas contables.
--
-- Patrón por tabla: nullable -> backfill -> NOT NULL -> índice nuevo ->
-- borrar índice viejo -> FK.
--
-- El backfill usa una subconsulta determinista sobre `companies` en vez de una
-- variable de sesión (@cid): si el ejecutor reparte las sentencias entre varias
-- conexiones, la variable se pierde y el UPDATE dejaría NULLs.
--
-- Borrar los uniques viejos NO es opcional. Con `tax_parameters_year_key` vivo,
-- la segunda empresa no podría crear su UIT de 2026 porque chocaría con la de la
-- primera. Se crea siempre el índice nuevo antes de borrar el viejo, para no
-- dejar ninguna ventana sin protección de unicidad.

-- ─── parties ────────────────────────────────────────────
ALTER TABLE `parties` ADD COLUMN `companyId` INTEGER NULL;
UPDATE `parties` SET `companyId` = (SELECT `id` FROM `companies` ORDER BY `id` LIMIT 1)
  WHERE `companyId` IS NULL;
ALTER TABLE `parties` MODIFY COLUMN `companyId` INTEGER NOT NULL;

CREATE UNIQUE INDEX `parties_companyId_tipoDocumento_numeroDocumento_key`
  ON `parties`(`companyId`, `tipoDocumento`, `numeroDocumento`);
DROP INDEX `parties_tipoDocumento_numeroDocumento_key` ON `parties`;

ALTER TABLE `parties` ADD CONSTRAINT `parties_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── vouchers ───────────────────────────────────────────
ALTER TABLE `vouchers` ADD COLUMN `companyId` INTEGER NULL;
UPDATE `vouchers` SET `companyId` = (SELECT `id` FROM `companies` ORDER BY `id` LIMIT 1)
  WHERE `companyId` IS NULL;
ALTER TABLE `vouchers` MODIFY COLUMN `companyId` INTEGER NOT NULL;

CREATE INDEX `vouchers_companyId_year_month_idx` ON `vouchers`(`companyId`, `year`, `month`);
CREATE INDEX `vouchers_companyId_fecha_idx` ON `vouchers`(`companyId`, `fecha`);
DROP INDEX `vouchers_year_month_idx` ON `vouchers`;

ALTER TABLE `vouchers` ADD CONSTRAINT `vouchers_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── inventory_assets ───────────────────────────────────
ALTER TABLE `inventory_assets` ADD COLUMN `companyId` INTEGER NULL;
UPDATE `inventory_assets` SET `companyId` = (SELECT `id` FROM `companies` ORDER BY `id` LIMIT 1)
  WHERE `companyId` IS NULL;
ALTER TABLE `inventory_assets` MODIFY COLUMN `companyId` INTEGER NOT NULL;

CREATE INDEX `inventory_assets_companyId_year_idx` ON `inventory_assets`(`companyId`, `year`);
DROP INDEX `inventory_assets_year_idx` ON `inventory_assets`;

ALTER TABLE `inventory_assets` ADD CONSTRAINT `inventory_assets_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── tax_parameters ─────────────────────────────────────
ALTER TABLE `tax_parameters` ADD COLUMN `companyId` INTEGER NULL;
UPDATE `tax_parameters` SET `companyId` = (SELECT `id` FROM `companies` ORDER BY `id` LIMIT 1)
  WHERE `companyId` IS NULL;
ALTER TABLE `tax_parameters` MODIFY COLUMN `companyId` INTEGER NOT NULL;

CREATE UNIQUE INDEX `tax_parameters_companyId_year_key` ON `tax_parameters`(`companyId`, `year`);
DROP INDEX `tax_parameters_year_key` ON `tax_parameters`;

ALTER TABLE `tax_parameters` ADD CONSTRAINT `tax_parameters_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── monthly_summaries ──────────────────────────────────
ALTER TABLE `monthly_summaries` ADD COLUMN `companyId` INTEGER NULL;
UPDATE `monthly_summaries` SET `companyId` = (SELECT `id` FROM `companies` ORDER BY `id` LIMIT 1)
  WHERE `companyId` IS NULL;
ALTER TABLE `monthly_summaries` MODIFY COLUMN `companyId` INTEGER NOT NULL;

CREATE UNIQUE INDEX `monthly_summaries_companyId_year_month_key`
  ON `monthly_summaries`(`companyId`, `year`, `month`);
DROP INDEX `monthly_summaries_year_month_key` ON `monthly_summaries`;

ALTER TABLE `monthly_summaries` ADD CONSTRAINT `monthly_summaries_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── annual_closures ────────────────────────────────────
ALTER TABLE `annual_closures` ADD COLUMN `companyId` INTEGER NULL;
UPDATE `annual_closures` SET `companyId` = (SELECT `id` FROM `companies` ORDER BY `id` LIMIT 1)
  WHERE `companyId` IS NULL;
ALTER TABLE `annual_closures` MODIFY COLUMN `companyId` INTEGER NOT NULL;

CREATE UNIQUE INDEX `annual_closures_companyId_year_key` ON `annual_closures`(`companyId`, `year`);
DROP INDEX `annual_closures_year_key` ON `annual_closures`;

ALTER TABLE `annual_closures` ADD CONSTRAINT `annual_closures_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
