import type { SiteConfig } from './types'
import raw from './site.json'

/**
 * Globális oldalbeállítások.
 *
 * Az értékek a site.json fájlban vannak (a ZeroCode Szerkesztő is ezt írja).
 */
export const site = raw as SiteConfig
