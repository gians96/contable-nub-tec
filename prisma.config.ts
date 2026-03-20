import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun prisma/seed.ts',
  },
  // `prisma generate` no conecta a la BD; un placeholder evita fallos en CI/Vercel si falta env en build.
  datasource: {
    url: process.env.DATABASE_URL || 'mysql://127.0.0.1:3306/placeholder',
  },
})
