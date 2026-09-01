import { mods } from '@/data'
import type { Mod } from '@/data/types'

/** Ékezet- és kisbetű-független normalizálás a kereséshez. */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase('hu')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function haystackForMod(mod: Mod): string {
  return normalize(
    [
      mod.name,
      mod.game,
      mod.shortDescription,
      mod.description.join(' '),
      mod.tags.join(' '),
      mod.features.join(' '),
      mod.author,
      mod.platform,
    ].join(' '),
  )
}

/** Igaz, ha a keresés minden szava szerepel a szövegben. */
export function matches(query: string, haystack: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  return terms.every((t) => haystack.includes(t))
}

export function searchMods(query: string): Mod[] {
  if (!query.trim()) return mods
  return mods.filter((m) => matches(query, haystackForMod(m)))
}

export interface QuickResult {
  title: string
  subtitle: string
  href: string
  image?: string
}

/** Fejléc-kereső gyorstalálatai. */
export function quickSearch(query: string, limit = 8): QuickResult[] {
  if (!query.trim()) return []
  return mods
    .filter((m) => matches(query, haystackForMod(m)))
    .map((m) => ({
      title: m.name,
      subtitle: m.game || 'Mod',
      href: `/modok/${m.slug}`,
      image: m.icon || m.cover,
    }))
    .slice(0, limit)
}
