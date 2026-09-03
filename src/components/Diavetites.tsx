import { useCallback, useEffect, useState } from 'react'
import { cx } from '@/lib/format'
import {
  BORITO_MERETEK,
  youtubeAzonosito,
  youtubeBeagyazas,
  youtubeBorito,
  youtubeKezdes,
} from '@/lib/video'
import { IconChevronLeft, IconChevronRight } from './Icons'

/**
 * Diavetítő: egyszerre egy nagy elem, alatta a vezérlőkkel.
 *
 * Az első elem lehet egy YouTube-videó, utána jönnek a képek. A nyilak és a
 * lapozópontok a videón és a képeken is ugyanúgy működnek.
 *
 * A nyilak és a lapozópontok szándékosan a kép ALATT vannak, nem rajta:
 * telefonon a képre helyezett gombok kitakarták a kép egy részét.
 *
 * Csak képútvonalakat vár - a képleírást (amit a képernyőolvasó felolvas
 * és a kereső lát) a mod nevéből állítjuk elő.
 */
export function Diavetites({
  kepek,
  video,
  nev,
}: {
  kepek: string[]
  video?: string
  nev: string
}) {
  const azonosito = youtubeAzonosito(video)
  const kezdes = youtubeKezdes(video)

  // A videó az első elem, utána a képek.
  const elemek: { fajta: 'video' | 'kep'; ertek: string }[] = [
    ...(azonosito ? [{ fajta: 'video' as const, ertek: azonosito }] : []),
    ...kepek.map((k) => ({ fajta: 'kep' as const, ertek: k })),
  ]

  const [index, setIndex] = useState(0)
  const [jatszik, setJatszik] = useState(false)
  // A legkisebbel indulunk, mert az biztosan létezik; ha van élesebb, arra váltunk.
  const [boritoMeret, setBoritoMeret] = useState('hqdefault')

  const lep = useCallback(
    (irany: number) => {
      setIndex((i) => (i + irany + elemek.length) % elemek.length)
    },
    [elemek.length],
  )

  // Ha közben kevesebb elem lett, ne mutasson a semmibe.
  useEffect(() => {
    if (index >= elemek.length) setIndex(0)
  }, [index, elemek.length])

  // Lapozásnál álljon le a videó, ne szóljon a háttérben.
  useEffect(() => {
    setJatszik(false)
  }, [index])

  /*
   * A nagy felbontású előnézeti kép nem minden videóhoz létezik. Sorra
   * kipróbáljuk a méreteket a legélesebbtől lefelé, és az elsőt használjuk,
   * amelyik tényleg letölthető - így soha nem lesz törött kép a helyén.
   *
   * A hiányzó méret helyett a YouTube egy 120x90-es szürke képet ad, ezért
   * a szélességet is megnézzük, nem csak azt, hogy betöltött-e.
   */
  useEffect(() => {
    if (!azonosito) return
    setBoritoMeret('hqdefault')
    let ervenyes = true
    const proba = new Image()

    let i = 0
    const kovetkezo = () => {
      if (!ervenyes || i >= BORITO_MERETEK.length) return
      proba.src = youtubeBorito(azonosito, BORITO_MERETEK[i])
    }
    proba.onload = () => {
      if (!ervenyes) return
      if (proba.naturalWidth > 200) setBoritoMeret(BORITO_MERETEK[i])
      else {
        i += 1
        kovetkezo()
      }
    }
    proba.onerror = () => {
      i += 1
      kovetkezo()
    }
    kovetkezo()

    return () => {
      ervenyes = false
      proba.onload = null
      proba.onerror = null
    }
  }, [azonosito])

  if (!elemek.length) return null

  const jelenlegi = Math.min(index, elemek.length - 1)
  const elem = elemek[jelenlegi]
  const tobbElem = elemek.length > 1

  // A képek sorszáma a videót nem számolja bele.
  const kepSorszam = (i: number) => (azonosito ? i : i + 1)

  const nyilOsztaly =
    'flex h-11 w-11 shrink-0 items-center justify-center border border-ink-600 bg-ink-900 text-ash-200 transition-colors hover:border-blood-600 hover:text-white'

  return (
    <section
      aria-roledescription="diavetítő"
      aria-label={`Képek: ${nev}`}
      tabIndex={tobbElem ? 0 : -1}
      onKeyDown={(e) => {
        if (!tobbElem) return
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          lep(1)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          lep(-1)
        }
      }}
      className="border border-ink-700 bg-ink-950"
    >
      {/* A kép semmivel nincs letakarva */}
      <div className="aspect-[16/9] w-full overflow-hidden bg-black">
        {elem.fajta === 'kep' && (
          <img
            key={elem.ertek}
            src={elem.ertek}
            alt={`${nev} - ${kepSorszam(jelenlegi)}. kép`}
            loading={jelenlegi === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full object-contain"
          />
        )}

        {elem.fajta === 'video' &&
          (jatszik ? (
            <iframe
              key={elem.ertek}
              src={youtubeBeagyazas(elem.ertek, kezdes)}
              title={`${nev} - videó`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          ) : (
            /*
             * Amíg a látogató rá nem kattint, csak egy állókép van itt.
             * Így a YouTube lejátszója nem tölt be minden oldalmegnyitáskor.
             */
            <button
              type="button"
              onClick={() => setJatszik(true)}
              aria-label={`${nev} - videó lejátszása`}
              className="group relative block h-full w-full cursor-pointer"
            >
              <img
                src={youtubeBorito(elem.ertek, boritoMeret)}
                alt=""
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
              {/* A képet nem sötétítjük: a piros gomb magától is jól látszik. */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-24 items-center justify-center border border-white/25 bg-blood-600/95 shadow-[0_10px_40px_rgba(0,0,0,0.6)] transition-colors group-hover:bg-blood-500">
                  <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden focusable="false">
                    <path d="M2 2 L24 15 L2 28 Z" fill="#fff" />
                  </svg>
                </span>
              </span>
            </button>
          ))}
      </div>

      {tobbElem && (
        <div className="flex items-center justify-center gap-3 border-t border-ink-700 px-3 py-3">
          <button
            type="button"
            onClick={() => lep(-1)}
            aria-label="Előző"
            className={nyilOsztaly}
          >
            <IconChevronLeft width={20} height={20} />
          </button>

          <div className="flex flex-wrap justify-center gap-1.5">
            {elemek.map((e, i) => (
              <button
                key={e.ertek + i}
                type="button"
                aria-label={e.fajta === 'video' ? 'Videó' : `${kepSorszam(i)}. kép`}
                aria-current={i === jelenlegi}
                onClick={() => setIndex(i)}
                className={cx(
                  'h-2.5 transition-colors',
                  // A videó pontja szélesebb, hogy első pillantásra látszódjon.
                  e.fajta === 'video' ? 'w-11' : 'w-7',
                  i === jelenlegi ? 'bg-blood-500' : 'bg-ink-600 hover:bg-ink-500',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => lep(1)}
            aria-label="Következő"
            className={nyilOsztaly}
          >
            <IconChevronRight width={20} height={20} />
          </button>
        </div>
      )}
    </section>
  )
}
