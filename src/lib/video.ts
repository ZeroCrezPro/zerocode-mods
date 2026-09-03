/**
 * YouTube-hivatkozás feldolgozása.
 *
 * A videó címe sokféle alakban másolható ki (megosztás gomb, böngésző
 * címsora, mobil, beágyazás), de mindegyikben ugyanaz a 11 karakteres
 * azonosító van. A szerkesztőbe bármelyik alak beírható.
 */

const AZONOSITO = /^[A-Za-z0-9_-]{11}$/

/** A videó azonosítója, vagy üres szöveg, ha nem YouTube-hivatkozás. */
export function youtubeAzonosito(cim: string | undefined | null): string {
  const t = String(cim ?? '').trim()
  if (!t) return ''
  if (AZONOSITO.test(t)) return t

  let u: URL
  try {
    u = new URL(t.includes('://') ? t : `https://${t}`)
  } catch {
    return ''
  }

  const gep = u.hostname.replace(/^www\./, '').replace(/^m\./, '')

  if (gep === 'youtu.be') {
    const id = u.pathname.split('/').filter(Boolean)[0] ?? ''
    return AZONOSITO.test(id) ? id : ''
  }

  if (gep === 'youtube.com' || gep === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v')
    if (v && AZONOSITO.test(v)) return v
    // /embed/ID, /shorts/ID, /live/ID, /v/ID
    const m = /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/.exec(u.pathname)
    if (m) return m[1]
  }

  return ''
}

/** Hányadik másodperctől induljon a videó? (a t= vagy start= paraméterből) */
export function youtubeKezdes(cim: string | undefined | null): number {
  const t = String(cim ?? '').trim()
  if (!t.includes('://') && !t.includes('?')) return 0
  let u: URL
  try {
    u = new URL(t.includes('://') ? t : `https://${t}`)
  } catch {
    return 0
  }
  const ertek = u.searchParams.get('t') ?? u.searchParams.get('start') ?? ''
  if (/^\d+$/.test(ertek)) return Number(ertek)
  // 1h2m3s alak
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(ertek)
  if (!m || !(m[1] || m[2] || m[3])) return 0
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}

/**
 * A beágyazott lejátszó címe.
 *
 * A nocookie változatot használjuk: a látogató addig nem kap követő sütit,
 * amíg el nem indítja a videót.
 */
export function youtubeBeagyazas(azonosito: string, kezdes = 0): string {
  const p = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1' })
  if (kezdes > 0) p.set('start', String(kezdes))
  return `https://www.youtube-nocookie.com/embed/${azonosito}?${p.toString()}`
}

/** Az oldalon megnyitható cím (ha valaki YouTube-on nézné meg). */
export function youtubeCim(azonosito: string, kezdes = 0): string {
  return `https://www.youtube.com/watch?v=${azonosito}${kezdes > 0 ? `&t=${kezdes}` : ''}`
}

/**
 * Előnézeti kép a videóhoz.
 *
 * A `hqdefault` minden videóhoz létezik, a `maxresdefault` viszont nem -
 * ezért a kisebbel indulunk, és csak akkor váltunk nagyobbra, ha az tényleg
 * letölthető (lásd Diavetites).
 */
export function youtubeBorito(azonosito: string, nagy = false): string {
  return `https://i.ytimg.com/vi/${azonosito}/${nagy ? 'maxresdefault' : 'hqdefault'}.jpg`
}
