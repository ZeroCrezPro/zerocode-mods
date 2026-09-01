import { games, mods } from '@/data'
import type { Game, Mod } from '@/data/types'

/** Ékezet- és kisbetű-független normalizálás a kereséshez. */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase('hu')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

function haystackForMod(mod: Mod, gameName: string): string {
  return normalize(
    [
      mod.name,
      gameName,
      mod.shortDescription,
      mod.description.join(' '),
      mod.tags.join(' '),
      mod.features.join(' '),
      mod.author,
      mod.platform,
    ].join(' '),
  )
}

function haystackForGame(game: Game): string {
  return normalize(
    [game.name, game.fullName, game.shortDescription, game.description.join(' ')].join(' '),
  )
}

/** Igaz, ha a keresés minden szava szerepel a szövegben. */
export function matches(query: string, haystack: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  return terms.every((t) => haystack.includes(t))
}

export function searchMods(query: string, gameNameOf: (mod: Mod) => string): Mod[] {
  if (!query.trim()) return mods
  return mods.filter((m) => matches(query, haystackForMod(m, gameNameOf(m))))
}

export function searchGames(query: string): Game[] {
  if (!query.trim()) return games
  return games.filter((g) => matches(query, haystackForGame(g)))
}

export interface QuickResult {
  type: 'mod' | 'game'
  title: string
  subtitle: string
  href: string
  image?: string
}

/** Fejléc-kereső gyorstalálatai (modok és játékok vegyesen). */
export function quickSearch(query: string, limit = 8): QuickResult[] {
  if (!query.trim()) return []
  const gameOf = (mod: Mod) => games.find((g) => g.id === mod.gameId)
  const modHits: QuickResult[] = mods
    .filter((m) => matches(query, haystackForMod(m, gameOf(m)?.name ?? '')))
    .map((m) => ({
      type: 'mod' as const,
      title: m.name,
      subtitle: gameOf(m)?.name ?? 'Mod',
      href: `/modok/${m.slug}`,
      image: m.icon ?? m.cover,
    }))
  const gameHits: QuickResult[] = games
    .filter((g) => matches(query, haystackForGame(g)))
    .map((g) => ({
      type: 'game' as const,
      title: g.name,
      subtitle: `${mods.filter((m) => m.gameId === g.id).length} mod`,
      href: `/jatekok/${g.slug}`,
      image: g.cover,
    }))
  return [...modHits, ...gameHits].slice(0, limit)
}
