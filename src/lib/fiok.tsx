import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { site } from '@/data/site'

/**
 * Bejelentkezett fiók - az egész oldalon elérhető állapot.
 *
 * A bejelentkezést egy HttpOnly süti tartja, amit a Cloudflare-függvények
 * adnak; a böngésző JS-ből nem éri el. Betöltéskor a /api/fiok/en mondja
 * meg, ki van belépve.
 */

export interface Fiok {
  nev: string
  email: string
  /** A profilkép címe, vagy üres */
  kepUrl: string
}

interface FiokAllapot {
  /** undefined = még nem tudjuk; null = nincs belépve */
  fiok: Fiok | null | undefined
  beallit: (fiok: Fiok | null) => void
  kilep: () => Promise<void>
}

const FiokContext = createContext<FiokAllapot>({ fiok: null, beallit: () => {}, kilep: async () => {} })

export const fiokokBekapcsolva = Boolean(site.fiok?.bekapcsolva)

/** Hívás a fiók API-hoz; a hibaszöveget a válaszból veszi. */
export async function fiokHivas<T = Record<string, unknown>>(
  ut: string,
  test?: Record<string, unknown>,
): Promise<{ ok: true; adat: T } | { ok: false; hiba: string }> {
  try {
    const v = await fetch(`/api/fiok/${ut}`, {
      method: test ? 'POST' : 'GET',
      headers: test ? { 'Content-Type': 'application/json' } : undefined,
      body: test ? JSON.stringify(test) : undefined,
      credentials: 'same-origin',
    })
    const adat = (await v.json().catch(() => ({}))) as { ok?: boolean; hiba?: string }
    if (!v.ok || !adat.ok) return { ok: false, hiba: adat.hiba || 'Valami nem sikerült - próbáld újra.' }
    return { ok: true, adat: adat as unknown as T }
  } catch {
    return { ok: false, hiba: 'Nem érem el a kiszolgálót - nézd meg a kapcsolatot.' }
  }
}

/* ---------- kép: betöltés, kivágás, WebP-optimalizálás ---------- */

/*
 * A WebP Converter program (D:\AI Code\AI Codex\WebP Converter) elve, a
 * böngészőbe átültetve:
 *   - a metaadatok (EXIF, GPS stb.) eldobása - a vászonra rajzolás ezt
 *     magától megteszi;
 *   - lépcsős, éles kicsinyítés (felezésekkel, mint a Lanczos: nem recés);
 *   - több tömörítés kipróbálása, és a legkisebb megtartása, ami még
 *     szemre jó - a méret soha nem nő az optimalizálástól.
 */

export const PROFILKEP_MERET = 256

/** Kép betöltése fájlból (a böngésző dekódol; EXIF-forgatást is kezel). */
export function kepBetolt(fajl: File): Promise<HTMLImageElement> {
  return new Promise((kesz, hiba) => {
    const url = URL.createObjectURL(fajl)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      kesz(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      hiba(new Error('Ez a fájl nem kép, vagy a böngésző nem tudja megnyitni.'))
    }
    img.src = url
  })
}

/** A vágókeret: a kép melyik részét mutatjuk. A keret a képen belül, kép-pixelben. */
export interface Kivagas {
  x: number
  y: number
  oldal: number
}

/** Alapállás: a legnagyobb középre tett négyzet. */
export function alapKivagas(img: HTMLImageElement): Kivagas {
  const oldal = Math.min(img.naturalWidth, img.naturalHeight)
  return { x: (img.naturalWidth - oldal) / 2, y: (img.naturalHeight - oldal) / 2, oldal }
}

/** A keret a képen belül maradjon, és legalább 32 pixeles legyen. */
export function kivagasSzorit(img: HTMLImageElement, k: Kivagas): Kivagas {
  const max = Math.min(img.naturalWidth, img.naturalHeight)
  const oldal = Math.max(32, Math.min(max, k.oldal))
  return {
    oldal,
    x: Math.max(0, Math.min(img.naturalWidth - oldal, k.x)),
    y: Math.max(0, Math.min(img.naturalHeight - oldal, k.y)),
  }
}

/**
 * A kivágott rész kicsinyítése a célméretre, lépcsőzetesen: amíg a
 * forrás több mint kétszer nagyobb, felezünk - így a kép éles marad.
 */
export function kepKivag(img: HTMLImageElement, k: Kivagas, meret = PROFILKEP_MERET): HTMLCanvasElement {
  let forras: CanvasImageSource = img
  let sx = k.x
  let sy = k.y
  let soldal = k.oldal
  while (soldal > meret * 2) {
    const fel = Math.ceil(soldal / 2)
    const lepcso = document.createElement('canvas')
    lepcso.width = fel
    lepcso.height = fel
    const c = lepcso.getContext('2d')
    if (!c) break
    c.imageSmoothingEnabled = true
    c.imageSmoothingQuality = 'high'
    c.drawImage(forras, sx, sy, soldal, soldal, 0, 0, fel, fel)
    forras = lepcso
    sx = 0
    sy = 0
    soldal = fel
  }
  const vaszon = document.createElement('canvas')
  vaszon.width = meret
  vaszon.height = meret
  const ctx = vaszon.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(forras, sx, sy, soldal, soldal, 0, 0, meret, meret)
  }
  return vaszon
}

const blobKeszit = (vaszon: HTMLCanvasElement, tipus: string, minoseg: number) =>
  new Promise<Blob | null>((r) => vaszon.toBlob(r, tipus, minoseg))

/**
 * Erős weboptimalizálás: több minőséggel lekódoljuk, és a legkisebbet
 * tartjuk meg, ami még szemre jó (a legmagasabb minőség a célméret alatt;
 * ha egyik sem fér bele, a legkisebb). WebP, ha a böngésző tudja; ha nem,
 * JPEG.
 */
export async function webpOptimalizal(vaszon: HTMLCanvasElement, celBajt = 40 * 1024): Promise<Blob> {
  const probak: Blob[] = []
  for (const q of [0.9, 0.82, 0.74, 0.66]) {
    const b = await blobKeszit(vaszon, 'image/webp', q)
    if (!b || b.type !== 'image/webp') break
    probak.push(b)
  }
  if (!probak.length) {
    for (const q of [0.9, 0.82, 0.74]) {
      const b = await blobKeszit(vaszon, 'image/jpeg', q)
      if (b) probak.push(b)
    }
  }
  if (!probak.length) throw new Error('A képet nem sikerült lekódolni.')
  // A próbák minőség szerint csökkennek: az első, ami a célméret alá fér, a legjobb.
  return probak.find((b) => b.size <= celBajt) ?? probak.reduce((a, b) => (b.size < a.size ? b : a))
}

/** Gyors út szerkesztő nélkül: középső négyzet, kicsinyítve, optimalizálva. */
export async function kepElokeszit(fajl: File): Promise<Blob> {
  const img = await kepBetolt(fajl)
  return webpOptimalizal(kepKivag(img, alapKivagas(img)))
}

/** Profilkép feltöltése (POST a képpel) vagy törlése (DELETE). */
export async function kepHivas(kep: Blob | null): Promise<{ ok: true; adat: { fiok: Fiok } } | { ok: false; hiba: string }> {
  try {
    const v = await fetch('/api/fiok/kep', {
      method: kep ? 'POST' : 'DELETE',
      headers: kep ? { 'Content-Type': kep.type || 'image/webp' } : undefined,
      body: kep ?? undefined,
      credentials: 'same-origin',
    })
    const adat = (await v.json().catch(() => ({}))) as { ok?: boolean; hiba?: string; fiok?: Fiok }
    if (!v.ok || !adat.ok || !adat.fiok) return { ok: false, hiba: adat.hiba || 'Valami nem sikerült - próbáld újra.' }
    return { ok: true, adat: { fiok: adat.fiok } }
  } catch {
    return { ok: false, hiba: 'Nem érem el a kiszolgálót - nézd meg a kapcsolatot.' }
  }
}

export function FiokProvider({ children }: { children: ReactNode }) {
  const [fiok, setFiok] = useState<Fiok | null | undefined>(fiokokBekapcsolva ? undefined : null)

  useEffect(() => {
    if (!fiokokBekapcsolva) return
    let el = false
    fiokHivas<{ fiok: Fiok }>('en').then((v) => {
      if (!el) setFiok(v.ok ? v.adat.fiok : null)
    })
    return () => {
      el = true
    }
  }, [])

  const kilep = useCallback(async () => {
    await fiokHivas('kilepes', {})
    setFiok(null)
  }, [])

  return <FiokContext.Provider value={{ fiok, beallit: setFiok, kilep }}>{children}</FiokContext.Provider>
}

export const useFiok = () => useContext(FiokContext)
