/**
 * Globális oldalbeállítások. Szinte minden szöveg és link innen jön.
 */
export const site = {
  name: 'ZeroCode Mods',
  brandTop: 'ZEROCODE',
  brandBottom: 'MODS',
  author: 'ZeroCode',
  tagline: 'Játékmodok, eszközök és fejlesztések egy helyen.',
  description:
    'ZeroCode Mods - saját készítésű játékmodok, trainerek és eszközök PC-re. Ingyenes letöltés, verziókövetés, telepítési útmutató és változási napló.',

  /** Éles cím. A deploy után írd át a saját domainre, ha egyedit kötsz be. */
  url: 'https://zerocode-mods.pages.dev',

  /** GitHub felhasználónév - ez adja a letöltési linkek alapját is. */
  githubUser: 'ZeroCrez',
  /** A weboldal forráskódjának repója. */
  githubRepo: 'zerocode-mods',
  /**
   * Alapértelmezett release-repó a modfájloknak.
   * Modonként/verziónként felülírható a download.repo mezővel.
   */
  releasesRepo: 'zerocode-mods-releases',

  email: 'papucslevi@gmail.com',

  /** Open Graph alapkép (public/ alatti útvonal) */
  ogImage: '/images/og-default.svg',

  /**
   * Összesített letöltésszám a főoldali statisztikához.
   * null = nincs mérve, ilyenkor helyette más statisztika jelenik meg.
   * Ha van valós adatod, írj ide számot (pl. 10420).
   */
  totalDownloadsOverride: null as number | null,
} as const

export type Site = typeof site
