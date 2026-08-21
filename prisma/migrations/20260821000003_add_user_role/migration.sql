-- Rol y estado de los usuarios, para la gestión desde /configuracion.
--
-- `updatedAt` lleva DEFAULT CURRENT_TIMESTAMP(3) explícito: Prisma lo generaría
-- NOT NULL sin default y el ALTER fallaría sobre una tabla que ya tiene filas
-- bajo el sql_mode estricto de MariaDB.

-- AlterTable
ALTER TABLE `users`
  ADD COLUMN `nombre`    VARCHAR(191) NULL,
  ADD COLUMN `role`      ENUM('ADMIN', 'USUARIO') NOT NULL DEFAULT 'USUARIO',
  ADD COLUMN `activo`    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Los usuarios que ya existían son los administradores del sistema; el default
-- USUARIO los dejaría sin acceso a la gestión de usuarios.
UPDATE `users` SET `role` = 'ADMIN';
