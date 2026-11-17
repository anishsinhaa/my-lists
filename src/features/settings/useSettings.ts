import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/services/http/apiFetch'
import type { EnrichProgress, PicksToggles, SettingsData } from '@/types/settings'
import { visiblePicks, type PicksEffective } from './picksVisibility'

const OFF: PicksEffective = { movies: false, series: false, games: false }

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<SettingsData>('/api/settings'),
    staleTime: 15_000,
  })
}

export function useEnrichStatus() {
  return useQuery({
    queryKey: ['enrich-status'],
    queryFn: () => apiFetch<EnrichProgress>('/api/settings/enrich/status'),
    refetchInterval: (query) => (query.state.data?.running === true ? 1000 : false),
  })
}

export function usePicksVisibility() {
  const query = useSettings()
  const fallbackOn = import.meta.env.VITE_FEATURE_PICKS === 'true'
  const fallback: PicksEffective = { movies: fallbackOn, series: fallbackOn, games: fallbackOn }
  const effective = query.isSuccess ? query.data.effective : query.isError ? fallback : OFF
  return { ...query, effective, visible: visiblePicks(effective), any: visiblePicks(effective).length > 0 }
}

export async function savePicks(picks: PicksToggles): Promise<SettingsData> {
  return apiFetch<SettingsData>('/api/settings', { method: 'PUT', body: JSON.stringify(picks) })
}

export async function startEnrich(body: { tab: string; force: boolean }): Promise<EnrichProgress> {
  return apiFetch<EnrichProgress>('/api/settings/enrich', { method: 'POST', body: JSON.stringify(body) })
}
