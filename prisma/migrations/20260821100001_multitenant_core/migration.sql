-- Multi-tenant, parte 1: empresas, membresías, rol de plataforma y auditoría.
--
-- `company_settings` era una fila única leída con findFirst() sin where. Se
-- renombra en vez de copiarse para conservar el id, al que apuntarán las FK de
-- todas las tablas contables en la migración siguiente.

-- ─── companies ──────────────────────────────────────────
RENAME TABLE `company_settings` TO `companies`;

ALTER TABLE `companies`
  ADD COLUMN `estado`              ENUM('ACTIVA','SUSPENDIDA') NOT NULL DEFAULT 'ACTIVA',
  ADD COLUMN `plan`                ENUM('FREE','PRO')          NOT NULL DEFAULT 'FREE',
  ADD COLUMN `limiteVouchersAnual` INTEGER NULL,
  ADD COLUMN `limiteUsuarios`      INTEGER NULL;

CREATE INDEX `companies_estado_idx` ON `companies`(`estado`);

-- ─── users: rol de plataforma ───────────────────────────
ALTER TABLE `users`
  ADD COLUMN `platformRole` ENUM('SUPERADMIN','USER') NOT NULL DEFAULT 'USER';

-- Un único superadmin, determinista: el ADMIN activo más antiguo. Promover a
-- todos los ADMIN les daría acceso a todas las empresas para siempre.
-- El subselect anidado es obligatorio en MySQL/MariaDB para leer y actualizar
-- la misma tabla en una sentencia.
UPDATE `users` SET `platformRole` = 'SUPERADMIN'
WHERE `id` = (SELECT `id` FROM (
  SELECT `id` FROM `users` WHERE `role` = 'ADMIN' AND `activo` = 1 ORDER BY `id` LIMIT 1
) AS `t`);

-- ─── memberships ────────────────────────────────────────
CREATE TABLE `memberships` (
  `id`        INTEGER NOT NULL AUTO_INCREMENT,
  `userId`    INTEGER NOT NULL,
  `companyId` INTEGER NOT NULL,
  `role`      ENUM('OWNER','ADMIN','CONTADOR','LECTOR') NOT NULL DEFAULT 'LECTOR',
  `activo`    BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `memberships_userId_companyId_key`(`userId`, `companyId`),
  INDEX `memberships_companyId_idx`(`companyId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `memberships` ADD CONSTRAINT `memberships_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Los usuarios existentes entran a la única empresa existente.
-- ADMIN -> OWNER; USUARIO -> CONTADOR y no LECTOR: hoy un USUARIO puede crear,
-- editar y borrar comprobantes (requireAdmin solo protege /api/users), así que
-- mandarlo a solo lectura le quitaría permisos en silencio.
INSERT INTO `memberships` (`userId`, `companyId`, `role`, `activo`)
SELECT u.`id`,
       (SELECT `id` FROM `companies` ORDER BY `id` LIMIT 1),
       CASE WHEN u.`role` = 'ADMIN' THEN 'OWNER' ELSE 'CONTADOR' END,
       u.`activo`
FROM `users` u;

-- ─── audit_logs ─────────────────────────────────────────
CREATE TABLE `audit_logs` (
  `id`        INTEGER NOT NULL AUTO_INCREMENT,
  `companyId` INTEGER NOT NULL,
  `userId`    INTEGER NULL,
  `accion`    ENUM('CREAR','ACTUALIZAR','ELIMINAR') NOT NULL,
  `entidad`   VARCHAR(191) NOT NULL,
  `entidadId` INTEGER NULL,
  `resumen`   VARCHAR(191) NULL,
  `datos`     TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `audit_logs_companyId_createdAt_idx`(`companyId`, `createdAt`),
  INDEX `audit_logs_companyId_entidad_entidadId_idx`(`companyId`, `entidad`, `entidadId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Los DEFAULT CURRENT_TIMESTAMP de `updatedAt` solo hacían falta para que el
-- ALTER no fallara sobre tablas con filas y para el INSERT de arriba. Prisma
-- gestiona @updatedAt en la aplicación, así que dejarlos crearía deriva
-- permanente frente a `migrate diff`. (El de `users` viene de
-- 20260821000003_add_user_role; se limpia aquí porque la columna ya está llena.)
ALTER TABLE `memberships` ALTER COLUMN `updatedAt` DROP DEFAULT;
ALTER TABLE `users` ALTER COLUMN `updatedAt` DROP DEFAULT;
