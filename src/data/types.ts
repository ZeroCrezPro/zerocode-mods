/**
 * ZeroCode Mods - központi adattípusok.
 *
 * Új játék/mod hozzáadásához NEM kell komponenst módosítani:
 * elég a src/data/games.ts és a src/data/mods.ts fájlokat bővíteni.
 * Részletes leírás: README.md
 */

/** Mod állapota. A megjelenő címke a src/lib/labels.ts-ben van. */
export type ModStatus = 'aktiv' | 'beta' | 'fejlesztes' | 'archivalt'

/** Mod fájltípusa a letöltési kártyán. */
export type ReleaseKind = 'Installer' | 'ZIP' | 'Patch' | 'Eszköz' | 'Forráskód'

export interface ExternalLink {
  label: string
  url: string
  /** true esetén kiemelt (piros) gombként jelenik meg */
  primary?: boolean
}

export interface InstallStep {
  title: string
  detail?: string
}

export interface FaqItem {
  question: string
  answer: string
}

/**
 * Letöltési forrás.
 *
 * - 'github-latest': mindig a legfrissebb release adott nevű fájlja.
 *   -> https://github.com/USER/REPO/releases/latest/download/FILE
 *   Új release után NEM kell átírni a linket.
 * - 'github-tag': egy konkrét release (régebbi verziók).
 *   -> https://github.com/USER/REPO/releases/download/TAG/FILE
 * - 'url': tetszőleges közvetlen link.
 */
export type DownloadSource =
  | { kind: 'github-latest'; file: string; repo?: string; owner?: string }
  | { kind: 'github-tag'; tag: string; file: string; repo?: string; owner?: string }
  | { kind: 'url'; url: string }

export interface ModVersion {
  version: string // pl. "1.2.0" (a "v" előtagot a felület teszi hozzá)
  releaseDate: string // ISO dátum
  /** Fájlméret emberi formában, pl. "18.4 MB" */
  size?: string
  platform?: string
  type?: ReleaseKind
  /** Letöltésszám. Kézzel karbantartott; ha nincs megadva, nem jelenik meg. */
  downloads?: number
  author?: string
  /** Rövid változáslista erre a verzióra (a letöltési kártyán jelenik meg) */
  changes?: string[]
  download: DownloadSource
  /** Előzetes/teszt kiadás jelölése */
  prerelease?: boolean
}

export interface Mod {
  id: string
  /** URL-barát azonosító: /modok/<slug> */
  slug: string
  name: string
  /** Melyik játékhoz készült, ahogy meg kell jelennie (pl. "Max Payne 2") */
  game: string
  shortDescription: string
  description: string[]
  cover: string
  banner?: string
  icon?: string
  author: string
  platform: string
  status: ModStatus
  tags: string[]
  features: string[]
  installationSteps: InstallStep[]
  /**
   * A diavetítő első eleme: egy YouTube-videó címe.
   * Bármelyik alak jó (youtu.be/..., watch?v=..., shorts/...).
   */
  video?: string
  /** Diavetítő a letöltés gomb alatt: csak képútvonalak, a felirat magától készül */
  slideshow?: string[]
  /** Verziók - a legfrissebb kerüljön elsőnek */
  versions: ModVersion[]
  faq: FaqItem[]
  externalLinks?: ExternalLink[]
  /** Megjelenjen-e a főoldal "Kiemelt modok" szekciójában */
  featured?: boolean
  /** Első kiadás dátuma (ISO) */
  createdAt: string
}

/** A site.json szerkezete (globális oldalbeállítások). */
export interface SiteConfig {
  name: string
  brandTop: string
  brandBottom: string
  author: string
  tagline: string
  description: string
  /** Éles cím, egyedi domain bekötése után ezt kell átírni */
  url: string
  githubUser: string
  githubRepo: string
  releasesRepo: string
  email: string
  /** Fejléc logó képe. Üresen a beépített ZeroCode jel látszik. */
  logo: string
  /** Böngészőfül ikonja. Üresen a beépített favicon.svg. */
  favicon: string
  /** Közösségi megosztókép (1200x630) */
  ogImage: string
  /**
   * Állandó feliratok (szekciócímek, oszlopnevek, gombfeliratok) felülírása.
   * A szerkesztő tölti, amikor színt vagy animációt adsz egy ilyen feliratnak.
   */
  feliratok?: Record<string, string>
  /** Összesített letöltésszám a főoldali statisztikához; null = nincs mérve */
  totalDownloadsOverride: number | null
}
