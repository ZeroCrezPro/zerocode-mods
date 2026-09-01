import type { Game } from './types'
import raw from './games.json'

/**
 * TÁMOGATOTT JÁTÉKOK
 *
 * Az adatok a games.json fájlban vannak. Szerkeszthetők kézzel, vagy a
 * ZeroCode Szerkesztő programmal (eszkoz/szerkeszto). A mezők jelentése
 * a types.ts fájlban van dokumentálva.
 */
export const games = raw as Game[]

export const getGameById = (id: string) => games.find((g) => g.id === id)
export const getGameBySlug = (slug: string) => games.find((g) => g.slug === slug)
