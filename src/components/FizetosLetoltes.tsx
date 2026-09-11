import { useEffect, useRef, useState } from 'react'
import type { FizetosTartalom } from '@/data/types'
import { btnClass } from './ui'
import { IconDownload, IconExternal } from './Icons'

/**
 * Fizetős (prémium) letöltés - a szabad letöltés gombja mellett.
 *
 * Menete a látogatónak:
 *   1. Megvásárlás  -> a szolgáltató fizetési oldala nyílik meg új lapon;
 *      fizetés után azonnal kap egy licenckulcsot (a képernyőn és e-mailben).
 *   2. A kulcsot ide beírja -> az oldal a szolgáltatónál ellenőrzi (másodperc).
 *   3. Érvényes kulcs után él a Letöltés gomb.
 *
 * A kulcsot a böngésző megjegyzi, így később újra le tudja tölteni anélkül,
 * hogy keresgélné.
 */
export function FizetosLetoltes({ slug, fizetos }: { slug: string; fizetos: FizetosTartalom }) {
  const taroloKulcs = `zc-kulcs-${slug}`

  const [nyitva, setNyitva] = useState(false)
  const [kulcs, setKulcs] = useState('')
  const [allapot, setAllapot] = useState<'ures' | 'ellenorzes' | 'ok' | 'hiba'>('ures')
  const [hiba, setHiba] = useState('')
  const mezo = useRef<HTMLInputElement>(null)

  const ellenoriz = async (ertek: string) => {
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
      const adat = (await v.json()) as { ok: boolean; hiba?: string }
      if (adat.ok) {
        setAllapot('ok')
        try {
          localStorage.setItem(taroloKulcs, k)
        } catch {
          /* privát mód - nem baj */
        }
      } else {
        setAllapot('hiba')
        setHiba(adat.hiba ?? 'A kulcs nem érvényes.')
        try {
          localStorage.removeItem(taroloKulcs)
        } catch {
          /* nincs tárhely */
        }
      }
    } catch {
      setAllapot('hiba')
      setHiba('Nem sikerült elérni az ellenőrzést. Nézd meg a kapcsolatot, és próbáld újra.')
    }
  }

  // Visszatérő vásárló: a korábban beírt kulcsot magától ellenőrizzük.
  useEffect(() => {
    let mentett = ''
    try {
      mentett = localStorage.getItem(taroloKulcs) ?? ''
    } catch {
      /* nincs tárhely */
    }
    if (mentett) {
      setKulcs(mentett)
      setNyitva(true)
      void ellenoriz(mentett)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taroloKulcs])

  useEffect(() => {
    if (nyitva && allapot !== 'ok') mezo.current?.focus()
  }, [nyitva, allapot])

  const letoltesCim = `/api/fizetos/letoltes?mod=${encodeURIComponent(slug)}&kulcs=${encodeURIComponent(kulcs.trim())}`

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
          {fizetos.ar}
        </span>
      </button>

      {nyitva && (
        <div className="mt-2.5 w-full max-w-xl border border-ink-600 bg-ink-900 p-4 sm:absolute sm:left-0 sm:z-20 sm:w-[28rem] sm:shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
          {fizetos.leiras && <p className="text-sm text-ash-300">{fizetos.leiras}</p>}

          {allapot !== 'ok' && (
            <>
              <a
                href={fizetos.vasarlasUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={btnClass('primary', 'md', 'mt-3 w-full')}
              >
                <IconExternal width={15} height={15} />
                Megvásárlás &middot; {fizetos.ar}
              </a>
              <p className="mt-2 text-xs text-ash-400">
                Fizetés után azonnal kapsz egy licenckulcsot - a képernyőn és e-mailben is. Azt írd be ide:
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  ref={mezo}
                  value={kulcs}
                  onChange={(e) => {
                    setKulcs(e.target.value)
                    if (allapot === 'hiba') setAllapot('ures')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void ellenoriz(kulcs)
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  aria-label="Licenckulcs"
                  className={`h-10 min-w-0 flex-1 border bg-ink-950 px-3 font-mono text-sm text-ash-100 outline-none placeholder:text-ash-500 ${
                    allapot === 'hiba' ? 'border-blood-500' : 'border-ink-600 focus:border-amber-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => void ellenoriz(kulcs)}
                  disabled={allapot === 'ellenorzes' || !kulcs.trim()}
                  className={btnClass('secondary', 'md', 'shrink-0')}
                >
                  {allapot === 'ellenorzes' ? 'Ellenőrzés…' : 'Ellenőrzés'}
                </button>
              </div>
              {allapot === 'hiba' && <p className="mt-2 text-xs text-blood-400">{hiba}</p>}
            </>
          )}

          {allapot === 'ok' && (
            <>
              <p className="mt-1 text-sm text-emerald-400">Érvényes kulcs - a letöltés indulhat.</p>
              <a href={letoltesCim} className={btnClass('primary', 'md', 'mt-3 w-full')}>
                <IconDownload width={16} height={16} />
                Letöltés &middot; {fizetos.fajl}
                {fizetos.meret ? ` (${fizetos.meret})` : ''}
              </a>
              <button
                type="button"
                onClick={() => {
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
                Másik kulcs megadása
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
