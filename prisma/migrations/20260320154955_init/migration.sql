-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ruc` VARCHAR(191) NOT NULL DEFAULT '',
    `razonSocial` VARCHAR(191) NOT NULL DEFAULT '',
    `nombreComercial` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `moneda` VARCHAR(191) NOT NULL DEFAULT 'PEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_parameters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `igvPercent` DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    `irMonthlyPercent` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
    `uit` DECIMAL(10, 2) NOT NULL,
    `irAnnualTramo1Limit` DECIMAL(5, 2) NOT NULL DEFAULT 15,
    `irAnnualTramo1Rate` DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    `irAnnualTramo2Rate` DECIMAL(5, 2) NOT NULL DEFAULT 29.50,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tax_parameters_year_key`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipoDocumento` ENUM('RUC', 'DNI', 'CE', 'OTRO') NOT NULL DEFAULT 'RUC',
    `numeroDocumento` VARCHAR(191) NOT NULL,
    `razonSocial` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parties_tipoDocumento_numeroDocumento_key`(`tipoDocumento`, `numeroDocumento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `tipoMovimiento` ENUM('VENTA', 'COMPRA') NOT NULL,
    `tipoComprobante` ENUM('FACTURA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'RECIBO_HONORARIOS', 'TICKET', 'OTRO') NOT NULL DEFAULT 'FACTURA',
    `serie` VARCHAR(191) NULL,
    `numero` VARCHAR(191) NULL,
    `partyId` INTEGER NULL,
    `rucDni` VARCHAR(191) NULL,
    `razonSocial` VARCHAR(191) NULL,
    `afectoIgv` BOOLEAN NOT NULL DEFAULT true,
    `importeTotal` DECIMAL(12, 2) NOT NULL,
    `baseImponible` DECIMAL(12, 2) NOT NULL,
    `igv` DECIMAL(12, 2) NOT NULL,
    `modoManual` BOOLEAN NOT NULL DEFAULT false,
    `medioPago` ENUM('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'DEPOSITO', 'CHEQUE', 'OTRO') NOT NULL DEFAULT 'TRANSFERENCIA',
    `estadoPago` ENUM('PAGADO', 'PENDIENTE', 'PARCIAL') NOT NULL DEFAULT 'PAGADO',
    `destinoTributario` ENUM('VENTA', 'COSTO_VENTAS', 'GASTO_ADMIN', 'GASTO_VENTA', 'ACTIVO_FIJO', 'NO_DEDUCIBLE') NOT NULL,
    `subcategoria` ENUM('SAAS', 'FACTURACION_ELECTRONICA', 'HOSTING', 'SOFTWARE', 'CAMARAS', 'PRODUCTO', 'FLETE', 'MOVILIDAD', 'SERVIDOR', 'INTERNET', 'UTILES', 'EQUIPO_PRUEBAS', 'LICENCIA', 'DOMINIO', 'OTRO') NOT NULL DEFAULT 'OTRO',
    `deducibleIr` BOOLEAN NOT NULL DEFAULT true,
    `creditoFiscalIgv` BOOLEAN NOT NULL DEFAULT true,
    `inventarioFinal` BOOLEAN NOT NULL DEFAULT false,
    `activoFijo` BOOLEAN NOT NULL DEFAULT false,
    `vidaUtilMeses` INTEGER NULL,
    `observacion` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vouchers_year_month_idx`(`year`, `month`),
    INDEX `vouchers_tipoMovimiento_idx`(`tipoMovimiento`),
    INDEX `vouchers_destinoTributario_idx`(`destinoTributario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voucherId` INTEGER NULL,
    `year` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `comprobante` VARCHAR(191) NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `categoria` ENUM('MERCADERIA', 'SERVIDOR', 'TICKETERA', 'LECTOR', 'LAPTOP', 'IMPRESORA', 'CAMARA', 'OTRO_EQUIPO') NOT NULL DEFAULT 'OTRO_EQUIPO',
    `base` DECIMAL(12, 2) NOT NULL,
    `igv` DECIMAL(12, 2) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `destinoTributario` ENUM('VENTA', 'COSTO_VENTAS', 'GASTO_ADMIN', 'GASTO_VENTA', 'ACTIVO_FIJO', 'NO_DEDUCIBLE') NOT NULL DEFAULT 'GASTO_ADMIN',
    `estadoCierre` ENUM('EN_USO', 'VENDIDO', 'DADO_BAJA', 'INVENTARIO_FINAL') NOT NULL DEFAULT 'EN_USO',
    `vidaUtilMeses` INTEGER NULL,
    `depreciacionMensual` DECIMAL(12, 2) NULL,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_assets_year_idx`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `baseVentas` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `igvVentas` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalVentas` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `baseComprasCreditoFiscal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `igvComprasCreditoFiscal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `costoVentas` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gastoAdministracion` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gastoVentas` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `activoFijo` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `comprasNoDeducibles` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `igvNetoMes` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `saldoIgvMesAnterior` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `saldoIgvMes` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `pagoIrSugerido` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `pagoIrEfectuado` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `pagoIgvEfectuado` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `pagoTotalSugerido` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `pagoTotalEfectuado` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `monthly_summaries_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `annual_closures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `ventasNetas` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `descuentos` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `costoVentas` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gastosVentas` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gastosAdministracion` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `otrosIngresos` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `otrosGastos` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `utilidadContable` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `adiciones` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `deducciones` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `rentaNetaImponible` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `pagosCuentaAcumulados` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `retenciones` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `saldoFavorAnterior` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `impuestoAnual` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `saldoPorPagar` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `saldoAFavor` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `annual_closures_year_key`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vouchers` ADD CONSTRAINT `vouchers_partyId_fkey` FOREIGN KEY (`partyId`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_assets` ADD CONSTRAINT `inventory_assets_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
