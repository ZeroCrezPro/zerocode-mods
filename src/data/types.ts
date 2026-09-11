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

/**
 * Fizetős letöltés egy modhoz.
 *
 * A fizetést és a számlázást a szolgáltató intézi (Lemon Squeezy vagy
 * Gumroad); tőlük kap a vásárló egy licenckulcsot. A kulcsot az oldal a
 * szolgáltató nyilvános ellenőrző címén azonnal ellenőrzi, és csak utána
 * adja ki a fájlt - a fájl maga a Cloudflare-en van, közvetlenül nem
 * érhető el.
 */
export interface FizetosTartalom {
  /** A gomb felirata, pl. "Prémium csomag" */
  cim: string
  /** Az ár a bolt pénznemében (pl. 69.99) - a Frissítés ezzel készíti a fizetőoldalt */
  ar: number | null
  /** Mit kap a vásárló (rövid) */
  leiras?: string
  /** A letölthető fájl neve - a szerkesztő tölti ki, amikor kijelölöd a fájlt */
  fajl: string
  /** A fájl mérete emberi formában (a szerkesztő tölti ki) */
  meret?: string

  /* --- Ezeket a Frissítés tölti ki, nem kell hozzájuk nyúlni --- */

  /** A Lemon Squeezy-nél létrehozott fizetőoldal címe */
  vasarlasUrl?: string
  /** A közös alaptermék változatának azonosítója - ezzel ellenőrzi az oldal a rendelést */
  termekAzonosito?: string
  szolgaltato?: 'lemonsqueezy' | 'gumroad'
  /** Milyen árral és módban készült a fizetőoldal - ha eltér, újra készül */
  checkoutAr?: number
  checkoutTeszt?: boolean
}

/** A Lemon Squeezy bolt közös alapterméke - a Beállításokban választható ki. */
export interface LemonBeallitas {
  storeId: string
  variantId: string
  termekNev: string
  /** A bolt pénzneme (pl. EUR) - az árak ebben értendők */
  penznem: string
  /** Próba mód: a fizetőoldalak teszt módban készülnek, nem valódi pénzzel */
  tesztMod?: boolean
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
   * Magyarosítás-jelző: bekapcsolva a borítókép jobb alsó sarkában egy
   * magyar zászló jelenik meg (/images/games/magyar-zaszlo.webp).
   */
  magyaritas?: boolean
  /**
   * Telepítési kód. Nem kerül bele az oldal szövegébe: a letöltés gomb
   * alatti dobozban lapul, és egy tíz másodpercenként változó négyjegyű
   * szám beírásával fedhető fel.
   */
  installCode?: string
  /** Fizetős (prémium) letöltés - üresen nincs ilyen gomb */
  fizetos?: FizetosTartalom
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
  /** A főoldal fejlécének háttérképe. Üresen a sima rácsos háttér látszik. */
  heroImage?: string
  /** Fizetés: a Lemon Squeezy közös alapterméke (nem titkos adat) */
  lemon?: LemonBeallitas
  /**
   * Állandó feliratok (szekciócímek, oszlopnevek, gombfeliratok) felülírása.
   * A szerkesztő tölti, amikor színt vagy animációt adsz egy ilyen feliratnak.
   */
  feliratok?: Record<string, string>
  /** Összesített letöltésszám a főoldali statisztikához; null = nincs mérve */
  totalDownloadsOverride: number | null
}
