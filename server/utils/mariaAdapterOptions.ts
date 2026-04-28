/**
 * Opciones del pool `mariadb` para `@prisma/adapter-mariadb`.
 * `allowPublicKeyRetrieval` evita fallos con caching_sha2_password (MySQL 8+)
 * en clientes remotos (p. ej. Vercel) cuando no hay clave RSA en el cliente.
 */
export function mariaPoolConfigFromDatabaseUrl(databaseUrl: string | URL) {
  const url = typeof databaseUrl === 'string' ? new URL(databaseUrl) : databaseUrl
  const database = url.pathname.replace(/^\//, '').split('/')[0] ?? ''

  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 5,
    allowPublicKeyRetrieval: true,
  }
}
