import { useEffect, useRef, useState } from 'react'
import type { FizetosTartalom } from '@/data/types'
import { btnClass } from './ui'
import { IconDownload, IconExternal } from './Icons'

/**
 * Fizetős (prémium) letöltés - a szabad letöltés gombja mellett.
 *
 * A vásárlónak semmit nem kell beírnia:
 *   1. Megvásárlás -> a fizetőablak az oldalon belül nyílik meg (Lemon Squeezy).
 *   2. Sikeres fizetéskor a fizetőablak jelez; az oldal a rendelést a
 *      szolgáltató API-jánál ellenőrzi (szerveroldalon, másodperc alatt),
 *      és kap egy aláírt letöltési jegyet.
 *   3. A Letöltés gomb magától feléled. A jegyet a böngésző megjegyzi,
 *      később keresgélés nélkül újra letölthető.
 *
 * Aki más gépről jön vissza, a vásárláskor e-mailben kapott licenckulcsot
 * írhatja be - ez a tartalék út.
 */

type Allapot = 'ures' | 'ellenorzes' | 'ok' | 'hiba'

interface Jegy {
  jegy: string
  fajl: string
}

declare global {
  interface Window {
    createLemonSqueezy?: () => void
    LemonSqueezy?: {
      Setup: (opciok: { eventHandler: (e: LemonEsemeny) => void }) => void
      Url: { Open: (url: string) => void; Close: () => void }
    }
  }
}

interface LemonEsemeny {
  event: string
  data?: { order?: { data?: { id?: string; attributes?: { identifier?: string } } } }
}

const LEMON_JS = 'https://app.lemonsqueezy.com/js/lemon.js'

/** A Lemon Squeezy beágyazó szkriptjének betöltése - csak egyszer, csak ha kell. */
function lemonBetolt(): Promise<void> {
  return new Promise((kesz, hiba) => {
    if (window.LemonSqueezy) return kesz()
    const meglevo = document.querySelector<HTMLScriptElement>(`script[src="${LEMON_JS}"]`)
    const inditas = () => {
      window.createLemonSqueezy?.()
      window.LemonSqueezy ? kesz() : hiba(new Error('nem indult el'))
    }
    if (meglevo) {
      meglevo.addEventListener('load', inditas, { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = LEMON_JS
    s.defer = true
    s.addEventListener('load', inditas, { once: true })
    s.addEventListener('error', () => hiba(new Error('a fizetőablak nem tölthető be')), { once: true })
    document.head.appendChild(s)
  })
}

export function FizetosLetoltes({
  slug,
  fizetos,
  arSzoveg,
}: {
  slug: string
  fizetos: FizetosTartalom
  arSzoveg: string
}) {
  const taroloKulcs = `zc-jegy-${slug}`
  const lemon = (fizetos.szolgaltato ?? 'lemonsqueezy') === 'lemonsqueezy'

  const [nyitva, setNyitva] = useState(false)
  const [allapot, setAllapot] = useState<Allapot>('ures')
  const [hiba, setHiba] = useState('')
  const [jegy, setJegy] = useState<Jegy | null>(null)
  const [kulcsMezo, setKulcsMezo] = useState(false)
  const [kulcs, setKulcs] = useState('')
  const [fizetoNyilik, setFizetoNyilik] = useState(false)
  const mezo = useRef<HTMLInputElement>(null)

  const jegyMent = (j: Jegy) => {
    setJegy(j)
    setAllapot('ok')
    try {
      localStorage.setItem(taroloKulcs, JSON.stringify(j))
    } catch {
      /* privát mód - nem baj */
    }
  }

  const hibaMutat = (uzenet: string) => {
    setAllapot('hiba')
    setHiba(uzenet)
  }

  /** Sikeres fizetés után: a rendelés ellenőrzése, jegy kérése. */
  const rendelesFeldolgoz = async (rendeles: string, azonosito: string) => {
    setAllapot('ellenorzes')
    setHiba('')
    try {
      const v = await fetch('/api/fizetos/rendeles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mod: slug, rendeles, azonosito }),
      })
      const adat = (await v.json()) as { ok: boolean; hiba?: string; jegy?: string; fajl?: string }
      if (adat.ok && adat.jegy) jegyMent({ jegy: adat.jegy, fajl: adat.fajl ?? fizetos.fajl })
      else {
        hibaMutat(adat.hiba ?? 'A rendelés ellenőrzése nem sikerült.')
        setKulcsMezo(true)
      }
    } catch {
      hibaMutat('Nem sikerült elérni az ellenőrzést. A vásárláskor kapott kulcsot ide is beírhatod:')
      setKulcsMezo(true)
    }
  }

  /** Tartalék: a licenckulcs beírása. */
  const kulcsEllenoriz = async (ertek: string) => {
    const k = ertek.trim()
    if (!k) return
    setAllapot('ellenorzes')
    setHiba('')
    try {
      const v = await fetch('/api/fizetos/ellenorzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mod: slug, kulcs: k }),
      })
      const adat = (await v.json()) as { ok: boolean; hiba?: string; jegy?: string; fajl?: string }
      if (adat.ok) jegyMent({ jegy: adat.jegy || `kulcs:${k}`, fajl: adat.fajl ?? fizetos.fajl })
      else hibaMutat(adat.hiba ?? 'A kulcs nem érvényes.')
    } catch {
      hibaMutat('Nem sikerült elérni az ellenőrzést. Nézd meg a kapcsolatot, és próbáld újra.')
    }
  }

  /** A fizetőablak megnyitása az oldalon belül. */
  const vasarlas = async () => {
    if (!lemon) {
      window.open(fizetos.vasarlasUrl ?? '', '_blank', 'noopener')
      setKulcsMezo(true)
      return
    }
    setFizetoNyilik(true)
    try {
      await lemonBetolt()
      window.LemonSqueezy!.Setup({
        eventHandler: (e) => {
          if (e.event !== 'Checkout.Success') return
          const rendeles = e.data?.order?.data?.id ?? ''
          const azonosito = e.data?.order?.data?.attributes?.identifier ?? ''
          window.LemonSqueezy?.Url.Close()
          void rendelesFeldolgoz(rendeles, azonosito)
        },
      })
      const url = new URL(fizetos.vasarlasUrl ?? '')
      url.searchParams.set('embed', '1')
      window.LemonSqueezy!.Url.Open(url.toString())
    } catch {
      // Ha az ablak nem nyílik (pl. tiltott szkript), új lapon is működik.
      window.open(fizetos.vasarlasUrl ?? '', '_blank', 'noopener')
      setKulcsMezo(true)
    } finally {
      setFizetoNyilik(false)
    }
  }

  // Visszatérő vásárló: a megjegyzett jegy.
  useEffect(() => {
    try {
      const mentett = localStorage.getItem(taroloKulcs)
      if (mentett) {
        const j = JSON.parse(mentett) as Jegy
        if (j?.jegy) {
          setJegy(j)
          setAllapot('ok')
          setNyitva(true)
        }
      }
    } catch {
      /* nincs tárhely vagy rossz adat */
    }
  }, [taroloKulcs])

  useEffect(() => {
    if (kulcsMezo) mezo.current?.focus()
  }, [kulcsMezo])

  const letoltesCim = jegy
    ? jegy.jegy.startsWith('kulcs:')
      ? `/api/fizetos/letoltes?mod=${encodeURIComponent(slug)}&kulcs=${encodeURIComponent(jegy.jegy.slice(6))}`
      : `/api/fizetos/letoltes?mod=${encodeURIComponent(slug)}&jegy=${encodeURIComponent(jegy.jegy)}`
    : '#'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setNyitva((v) => !v)}
        aria-expanded={nyitva}
        className={btnClass('secondary', 'lg', 'gap-3 border-amber-500/40 hover:border-amber-400')}
      >
        <span>{fizetos.cim}</span>
        <span className="border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-black tracking-wide text-amber-300 normal-case">
          {arSzoveg}
        </span>
      </button>

      {nyitva && (
        <div className="mt-2.5 w-full max-w-xl border border-ink-600 bg-ink-900 p-4 sm:absolute sm:left-0 sm:z-20 sm:w-[28rem] sm:shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
          {fizetos.leiras && <p className="text-sm text-ash-300">{fizetos.leiras}</p>}

          {allapot === 'ok' && jegy ? (
            <>
              <p className="mt-1 text-sm text-emerald-400">Köszönjük a vásárlást - a letöltés indulhat.</p>
              <a href={letoltesCim} className={btnClass('primary', 'md', 'mt-3 w-full')}>
                <IconDownload width={16} height={16} />
                Letöltés &middot; {jegy.fajl}
                {fizetos.meret ? ` (${fizetos.meret})` : ''}
              </a>
              <button
                type="button"
                onClick={() => {
                  setJegy(null)
                  setAllapot('ures')
                  setKulcs('')
                  try {
                    localStorage.removeItem(taroloKulcs)
                  } catch {
                    /* nincs tárhely */
                  }
                }}
                className="mt-2 text-xs text-ash-500 underline-offset-2 hover:text-ash-300 hover:underline"
              >
                Nem ez a vásárlásod? Törlés
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void vasarlas()}
                disabled={fizetoNyilik || allapot === 'ellenorzes'}
                className={btnClass('primary', 'md', 'mt-3 w-full')}
              >
                <IconExternal width={15} height={15} />
                {allapot === 'ellenorzes'
                  ? 'Fizetés ellenőrzése…'
                  : fizetoNyilik
                    ? 'Fizetőablak nyílik…'
                    : `Megvásárlás · ${arSzoveg}`}
              </button>
              <p className="mt-2 text-xs text-ash-400">
                Kártya, Google Pay, Apple Pay vagy PayPal. Fizetés után a Letöltés gomb magától feléled.
              </p>

              {allapot === 'hiba' && <p className="mt-2 text-xs text-blood-400">{hiba}</p>}

              {kulcsMezo ? (
                <div className="mt-3 flex gap-2">
                  <input
                    ref={mezo}
                    value={kulcs}
                    onChange={(e) => setKulcs(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void kulcsEllenoriz(kulcs)
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="licenckulcs az e-mailből"
                    aria-label="Licenckulcs"
                    className="h-10 min-w-0 flex-1 border border-ink-600 bg-ink-950 px-3 font-mono text-sm text-ash-100 outline-none placeholder:text-ash-500 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => void kulcsEllenoriz(kulcs)}
                    disabled={allapot === 'ellenorzes' || !kulcs.trim()}
                    className={btnClass('secondary', 'md', 'shrink-0')}
                  >
                    Ellenőrzés
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setKulcsMezo(true)}
                  className="mt-3 text-xs text-ash-500 underline-offset-2 hover:text-ash-300 hover:underline"
                >
                  Korábban már megvettem - kulcs beírása
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
