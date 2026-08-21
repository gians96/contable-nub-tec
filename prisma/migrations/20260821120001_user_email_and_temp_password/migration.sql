-- Inicio de sesión con usuario o correo, y contraseñas temporales marcadas.
--
-- `email` es nullable y unique a la vez: MySQL admite varios NULL en un índice
-- único, así que las cuentas que no tengan correo no chocan entre sí.

ALTER TABLE `users`
  ADD COLUMN `email` VARCHAR(191) NULL,
  ADD COLUMN `debeCambiarPassword` BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);
