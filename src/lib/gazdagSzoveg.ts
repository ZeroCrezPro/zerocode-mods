/**
 * A szerkesztőben formázott szövegrészek biztonságos megjelenítése.
 *
 * A szerkesztő <span> elemekbe teszi a kijelölt részeket - színnel és/vagy
 * animációval. Ez a fájl gondoskodik róla, hogy CSAK ezek kerüljenek ki az
 * oldalra: minden más HTML kiszűrődik. Így akkor sem kerülhet kártékony
 * kód az oldalra, ha egy adatfájl máshonnan érkezik.
 */

/** Az engedélyezett animációk (a src/index.css osztályaival egyezően). */
export const ANIMACIOK = [
  { ertek: '', nev: 'Nincs animáció' },
  { ertek: 'fade-in', nev: 'Fade In - halvány megjelenés' },
  { ertek: 'fade-up', nev: 'Fade Up - alulról úszik be' },
  { ertek: 'fade-down', nev: 'Fade Down - felülről úszik be' },
  { ertek: 'fade-left', nev: 'Fade Left - jobbról úszik be' },
  { ertek: 'fade-right', nev: 'Fade Right - balról úszik be' },
  { ertek: 'zoom-in', nev: 'Zoom In - felnagyítva jelenik meg' },
  { ertek: 'pulse', nev: 'Pulse - lüktet' },
  { ertek: 'float', nev: 'Float - lebeg' },
  { ertek: 'typewriter', nev: 'Typewriter - írógép' },
  { ertek: 'glow', nev: 'Glow - világít' },
  { ertek: 'shake', nev: 'Shake - remeg' },
] as const

const ENGEDETT_ANIMACIOK = new Set<string>(ANIMACIOK.map((a) => a.ertek).filter(Boolean))

/** Csak #rgb és #rrggbb formátumú színt fogadunk el. */
const SZIN_MINTA = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** A böngésző rgb(...) alakban is adhatja a színt; hexre hozzuk. */
function szinNormalizal(ertek: string): string {
  const t = ertek.trim()
  if (SZIN_MINTA.test(t)) return t.toLowerCase()
  const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(t)
  if (!m) return ''
  const sz = [m[1], m[2], m[3]].map(Number)
  if (sz.some((n) => n > 255)) return ''
  return '#' + sz.map((n) => n.toString(16).padStart(2, '0')).join('')
}

/**
 * Kiszűri a nem engedélyezett HTML-t.
 *
 * Megmarad: <br>, <strong>, <em>, és a <span> a saját osztályaival
 * (zc-anim-*) meg egy egyszerű color stílussal. Minden más elem
 * eltűnik, a szövegtartalma viszont megmarad.
 */
export function tisztitHtml(nyers: string): string {
  // A korábban egyszerű szövegként mentett bekezdésekben sortörés van;
  // HTML-ben az magától nem látszik, ezért <br /> lesz belőle.
  nyers = nyers.replace(/\r\n?|\n/g, '<br />')
  let ki = ''
  let i = 0

  const szovegEsc = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  while (i < nyers.length) {
    const nyit = nyers.indexOf('<', i)
    if (nyit === -1) {
      ki += nyers.slice(i)
      break
    }

    ki += nyers.slice(i, nyit)

    const zar = nyers.indexOf('>', nyit)
    if (zar === -1) {
      // Csonka jelölő: szövegként kezeljük
      ki += szovegEsc(nyers.slice(nyit))
      break
    }

    const cimke = nyers.slice(nyit + 1, zar).trim()
    i = zar + 1

    if (/^br\s*\/?$/i.test(cimke)) {
      ki += '<br />'
      continue
    }
    if (/^\/?(strong|b)$/i.test(cimke)) {
      ki += cimke.startsWith('/') ? '</strong>' : '<strong>'
      continue
    }
    if (/^\/?(em|i)$/i.test(cimke)) {
      ki += cimke.startsWith('/') ? '</em>' : '<em>'
      continue
    }
    if (/^\/span$/i.test(cimke)) {
      ki += '</span>'
      continue
    }
    if (/^span(\s|$)/i.test(cimke)) {
      ki += nyitoSpan(cimke)
      continue
    }
    // Minden más elem elmarad (a tartalma megmarad)
  }

  return ki
}

/** A <span> engedélyezett tulajdonságainak átemelése. */
function nyitoSpan(cimke: string): string {
  const osztalyok: string[] = []
  let szin = ''

  const classTalalat = /class\s*=\s*"([^"]*)"/i.exec(cimke) ?? /class\s*=\s*'([^']*)'/i.exec(cimke)
  if (classTalalat) {
    for (const o of classTalalat[1].split(/\s+/)) {
      if (o.startsWith('zc-anim-') && ENGEDETT_ANIMACIOK.has(o.slice('zc-anim-'.length))) {
        osztalyok.push(o)
      }
    }
  }

  const styleTalalat = /style\s*=\s*"([^"]*)"/i.exec(cimke) ?? /style\s*=\s*'([^']*)'/i.exec(cimke)
  if (styleTalalat) {
    const szinTalalat = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(styleTalalat[1])
    if (szinTalalat) {
      szin = szinNormalizal(szinTalalat[1])
    }
  }

  if (!osztalyok.length && !szin) return '<span>'
  const c = osztalyok.length ? ` class="${osztalyok.join(' ')}"` : ''
  const s = szin ? ` style="color:${szin}"` : ''
  return `<span${c}${s}>`
}

/** HTML nélküli változat - meta leíráshoz, kereséshez. */
export function csakSzoveg(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
