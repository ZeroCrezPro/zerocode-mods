/**
 * ZeroCode Mods - központi adattípusok.
 *
 * Új játék/mod hozzáadásához NEM kell komponenst módosítani:
 * elég a src/data/games.ts és a src/data/mods.ts fájlokat bővíteni.
 * Részletes leírás: README.md
 */

/** Mod állapota. A megjelenő címke a src/lib/labels.ts-ben van. */
export type ModStatus = 'aktiv' | 'beta' | 'fejlesztes' | 'archivalt'

/** Kompatibilitási állapot egy adott játékkiadáshoz. */
export type CompatState = 'tesztelve' | 'reszben' | 'nem-tesztelt' | 'nem-tamogatott'

/** Changelog bejegyzés-csoport típusa. */
export type ChangeKind = 'uj' | 'javitva' | 'modositva' | 'eltavolitva'

/** Mod fájltípusa a letöltési kártyán. */
export type ReleaseKind = 'Installer' | 'ZIP' | 'Patch' | 'Eszköz' | 'Forráskód'

export interface ExternalLink {
  label: string
  url: string
  /** true esetén kiemelt (piros) gombként jelenik meg */
  primary?: boolean
}

export interface Screenshot {
  src: string
  alt: string
  caption?: string
}

export interface Requirement {
  label: string
  value: string
}

export interface InstallStep {
  title: string
  detail?: string
}

export interface Compatibility {
  label: string
  state: CompatState
  note?: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface ChangeGroup {
  kind: ChangeKind
  items: string[]
}

export interface ChangelogEntry {
  version: string
  date: string // ISO: 2026-08-31
  groups: ChangeGroup[]
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

export interface Game {
  id: string
  /** URL-barát azonosító: /jatekok/<slug> */
  slug: string
  /** Rövid név a kártyákon, pl. "Max Payne 2" */
  name: string
  /** Teljes cím, pl. "Max Payne 2: The Fall of Max Payne" */
  fullName: string
  releaseYear: number
  developer?: string
  publisher?: string
  platforms: string[]
  /** Egymondatos összefoglaló (kártyák, meta description) */
  shortDescription: string
  /** Bekezdésekre bontott ismertető */
  description: string[]
  cover: string
  banner?: string
  externalLinks?: ExternalLink[]
  /** Sorrend a listákban (kisebb = előrébb) */
  order?: number
}

export interface Mod {
  id: string
  /** URL-barát azonosító: /modok/<slug> */
  slug: string
  name: string
  /** A Game.id értéke */
  gameId: string
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
  requirements: Requirement[]
  installationSteps: InstallStep[]
  compatibility: Compatibility[]
  screenshots: Screenshot[]
  /** Verziók - a legfrissebb kerüljön elsőnek */
  versions: ModVersion[]
  changelog: ChangelogEntry[]
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
  ogImage: string
  /** Összesített letöltésszám a főoldali statisztikához; null = nincs mérve */
  totalDownloadsOverride: number | null
}
