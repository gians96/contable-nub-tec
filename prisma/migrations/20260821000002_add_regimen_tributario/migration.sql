-- Régimen tributario por año, con sus parámetros.
-- Vive en `tax_parameters` y no en una tabla propia porque sería 1:1 con ella
-- y duplicaría la consulta en los cinco endpoints que ya la leen.

-- AlterTable
ALTER TABLE `tax_parameters`
  ADD COLUMN `irAnnualFlatRate`    DECIMAL(5, 2)  NOT NULL DEFAULT 29.50,
  ADD COLUMN `regimen`             ENUM('NRUS', 'RER', 'RMT', 'RG') NOT NULL DEFAULT 'RMT',
  ADD COLUMN `nrusCategoria`       INTEGER        NOT NULL DEFAULT 1,
  ADD COLUMN `nrusCuotaCat1`       DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
  ADD COLUMN `nrusCuotaCat2`       DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  ADD COLUMN `nrusLimiteCat1`      DECIMAL(12, 2) NOT NULL DEFAULT 5000.00,
  ADD COLUMN `nrusLimiteCat2`      DECIMAL(12, 2) NOT NULL DEFAULT 8000.00,
  ADD COLUMN `rerRate`             DECIMAL(5, 2)  NOT NULL DEFAULT 1.50,
  ADD COLUMN `rmtUmbralUit`        DECIMAL(10, 2) NOT NULL DEFAULT 300,
  ADD COLUMN `rmtLimiteRegimenUit` DECIMAL(10, 2) NOT NULL DEFAULT 1700,
  ADD COLUMN `pagoCuentaMinRate`   DECIMAL(5, 2)  NOT NULL DEFAULT 1.50,
  ADD COLUMN `coeficienteManual`   DECIMAL(8, 6)  NULL;
