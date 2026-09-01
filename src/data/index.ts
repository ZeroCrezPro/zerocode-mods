import { mods, getModBySlug } from './mods'
import { site } from './site'
import { compareVersionDesc } from '@/lib/format'
import type { Mod, ModVersion } from './types'

export * from './types'
export { mods, site, getModBySlug }

/** Egy mod legfrissebb verziója. */
export function latestVersion(mod: Mod): ModVersion | undefined {
  return [...mod.versions].sort(
    (a, b) =>
      b.releaseDate.localeCompare(a.releaseDate) || compareVersionDesc(a.version, b.version),
  )[0]
}

/** Régebbi verziók, a legfrissebb nélkül. */
export function olderVersions(mod: Mod): ModVersion[] {
  const latest = latestVersion(mod)
  return mod.versions.filter((v) => v !== latest)
}

/** A mod utolsó frissítésének dátuma (ISO). */
export function lastUpdated(mod: Mod): string {
  return latestVersion(mod)?.releaseDate ?? mod.createdAt
}

/** Összes kiadás (verzió) száma. */
export function totalReleases(): number {
  return mods.reduce((sum, m) => sum + m.versions.length, 0)
}

/** Összes letöltés, ha van rögzített adat. */
export function totalDownloads(): number | null {
  if (site.totalDownloadsOverride !== null) return site.totalDownloadsOverride
  const sum = mods.reduce(
    (acc, m) => acc + m.versions.reduce((a, v) => a + (v.downloads ?? 0), 0),
    0,
  )
  return sum > 0 ? sum : null
}

/** Minden létező tag, előfordulás szerint csökkenő sorrendben. */
export function allTags(): { tag: string; count: number }[] {
  const map = new Map<string, number>()
  for (const m of mods) for (const t of m.tags) map.set(t, (map.get(t) ?? 0) + 1)
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'hu'))
}

export interface ReleaseFeedItem {
  mod: Mod
  version: ModVersion
}

/** Az összes kiadás időrendben, legfrissebb elöl. */
export function releaseFeed(limit?: number): ReleaseFeedItem[] {
  const items: ReleaseFeedItem[] = []
  for (const mod of mods) {
    for (const version of mod.versions) items.push({ mod, version })
  }
  items.sort(
    (a, b) =>
      b.version.releaseDate.localeCompare(a.version.releaseDate) ||
      compareVersionDesc(a.version.version, b.version.version),
  )
  return typeof limit === 'number' ? items.slice(0, limit) : items
}

/** Kiemelt modok a főoldalra. */
export function featuredMods(limit = 6): Mod[] {
  const featured = mods.filter((m) => m.featured)
  const pool = featured.length ? featured : mods
  return [...pool].sort((a, b) => lastUpdated(b).localeCompare(lastUpdated(a))).slice(0, limit)
}
