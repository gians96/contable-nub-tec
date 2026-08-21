import type { RegimenSpec } from '#shared/types/tax'

export interface AppContext {
  year: number
  company: {
    ruc: string
    razonSocial: string
    nombreComercial: string | null
    direccion: string | null
    moneda: string
  }
  regimen: string
  regimenSpec: RegimenSpec
  igvPercent: number
  uit: number
}

/**
 * Empresa, régimen y parámetros del año en curso.
 *
 * Va por `useAsyncData` con clave fija: se resuelve una vez en el servidor, el
 * payload viaja al cliente y todas las vistas comparten el mismo dato sin
 * repetir la petición ni provocar desajustes de hidratación en el header.
 */
export function useAppContext() {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  const { data: context, refresh } = useAsyncData<AppContext | null>(
    'app-context',
    () => $fetch<AppContext>('/api/settings/context', { headers }).catch(() => null),
    { default: () => null },
  )

  const titulo = computed(() =>
    context.value?.company.razonSocial?.trim() ||
    context.value?.company.nombreComercial?.trim() ||
    'ContaPYME'
  )

  const regimenLabel = computed(() => context.value?.regimenSpec?.label ?? 'MYPE')
  const igvPorDefecto = computed(() => context.value?.igvPercent ?? 18)

  return { context, refresh, titulo, regimenLabel, igvPorDefecto }
}
