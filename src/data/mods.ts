import type { Mod } from './types'
import raw from './mods.json'

/**
 * MODOK
 *
 * Az adatok a mods.json fájlban vannak. Szerkeszthetők kézzel, vagy a
 * ZeroCode Szerkesztő programmal (eszkoz/szerkeszto). A mezők jelentése
 * a types.ts fájlban van dokumentálva.
 */
export const mods = raw as Mod[]

export const getModBySlug = (slug: string) => mods.find((m) => m.slug === slug)
export const getModsByGameId = (gameId: string) => mods.filter((m) => m.gameId === gameId)
