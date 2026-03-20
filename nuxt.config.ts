import tailwindcss from '@tailwindcss/vite'
import { normalize } from 'node:path'
import { pathToFileURL } from 'node:url'

// Nitro dev spawns a child worker that listens on a named pipe on Windows; that path can fail or race and the
// worker then exits with code 0 ("worker exited with code 0"). TCP avoids the pipe entirely.
if (process.platform === 'win32') {
  process.env.NITRO_NO_UNIX_SOCKET ??= '1'
}

// Nitro dev (trace: false) marks some deps external with absolute `C:\...` ids; Node ESM requires `file:///`.
function fixWindowsDriveLetterImports(code: string) {
  if (process.platform !== 'win32') return code
  const toFileUrl = (winPath: string) => {
    try {
      return pathToFileURL(normalize(winPath)).href
    } catch {
      return null
    }
  }
  let out = code
  out = out.replace(/\bfrom\s+(['"])([A-Za-z]:\\[^'"]+)\1/g, (full, q: string, p: string) => {
    const href = toFileUrl(p)
    return href ? `from ${q}${href}${q}` : full
  })
  out = out.replace(/\bimport\s*\(\s*(['"])([A-Za-z]:\\[^'"]+)\1\s*\)/g, (full, q: string, p: string) => {
    const href = toFileUrl(p)
    return href ? `import(${q}${href}${q})` : full
  })
  return out
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV === 'development' },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    build: {
      // ApexCharts minificado ~1.1MB en su propio chunk; el umbral por defecto (500) siempre avisa.
      chunkSizeWarningLimit: 1600,
      // Evita avisos del plugin @tailwindcss/vite sobre sourcemaps incorrectos en build SSR/cliente.
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) return 'apexcharts'
            }
          },
        },
      },
    },
  },

  runtimeConfig: {
    authSecret: process.env.AUTH_SECRET || 'dev-secret-change-in-production',
  },

  app: {
    head: {
      title: 'ContaPYME - Control Tributario',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Control tributario y financiero para MYPE Perú - Régimen MYPE Tributario' },
      ],
      htmlAttrs: { lang: 'es' },
    },
  },

  nitro: {
    experimental: {
      wasm: true,
    },
    // Prisma: bundling breaks `.prisma/client` resolution.
    // xlsx: Rollup on Windows can emit `import from 'C:\...'` (invalid ESM); keep it external.
    externals: {
      external: ['@prisma/client', '@prisma/adapter-mariadb', 'xlsx'],
      traceInclude: [
        'node_modules/@prisma/client',
        'node_modules/.prisma/client',
        'node_modules/xlsx',
      ],
    },
    hooks: {
      'rollup:before'(_nitro, config) {
        config.plugins ??= []
        config.plugins.push({
          name: 'fix-windows-drive-letter-esm-imports',
          generateBundle(_opts, bundle) {
            if (process.platform !== 'win32') return
            for (const chunk of Object.values(bundle)) {
              if (chunk.type === 'chunk' && typeof chunk.code === 'string') {
                const next = fixWindowsDriveLetterImports(chunk.code)
                if (next !== chunk.code) chunk.code = next
              }
            }
          },
        })
      },
    },
  },

})
