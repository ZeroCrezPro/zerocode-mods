import { useCallback, useEffect, useState } from 'react'
import { cx } from '@/lib/format'
import { IconChevronLeft, IconChevronRight } from './Icons'

/**
 * Diavetítő: egyszerre egy nagy kép, két oldalán nyilakkal.
 *
 * A mod adatlapján a letöltés gomb és a leírás között jelenik meg, hogy
 * rögtön látszódjon, hogyan néz ki a mod. Csak képútvonalakat vár - a
 * képleírást (amit a képernyőolvasó felolvas és a kereső lát) a mod
 * nevéből állítjuk elő, hogy ne kelljen külön beírni.
 */
export function Diavetites({ kepek, nev }: { kepek: string[]; nev: string }) {
  const [index, setIndex] = useState(0)

  const lep = useCallback(
    (irany: number) => {
      setIndex((i) => (i + irany + kepek.length) % kepek.length)
    },
    [kepek.length],
  )

  // Ha közben kevesebb kép lett, ne mutasson a semmibe
  useEffect(() => {
    if (index >= kepek.length) setIndex(0)
  }, [index, kepek.length])

  if (!kepek.length) return null

  const jelenlegi = Math.min(index, kepek.length - 1)
  const tobbKep = kepek.length > 1

  return (
    <section
      aria-roledescription="diavetítő"
      aria-label={`Képek: ${nev}`}
      tabIndex={tobbKep ? 0 : -1}
      onKeyDown={(e) => {
        if (!tobbKep) return
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
      <div className="relative">
        <div className="aspect-[16/9] w-full overflow-hidden bg-black">
          <img
            key={kepek[jelenlegi]}
            src={kepek[jelenlegi]}
            alt={`${nev} - ${jelenlegi + 1}. kép`}
            loading={jelenlegi === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full object-contain"
          />
        </div>

        {tobbKep && (
          <>
            <button
              type="button"
              onClick={() => lep(-1)}
              aria-label="Előző kép"
              className="absolute top-1/2 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-ink-600 bg-ink-950/80 text-ash-200 backdrop-blur-sm transition-colors hover:border-blood-600 hover:text-white sm:left-4"
            >
              <IconChevronLeft width={20} height={20} />
            </button>
            <button
              type="button"
              onClick={() => lep(1)}
              aria-label="Következő kép"
              className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-ink-600 bg-ink-950/80 text-ash-200 backdrop-blur-sm transition-colors hover:border-blood-600 hover:text-white sm:right-4"
            >
              <IconChevronRight width={20} height={20} />
            </button>

            <span className="absolute top-3 right-3 border border-ink-600 bg-ink-950/85 px-2 py-1 font-mono text-xs text-ash-300">
              {jelenlegi + 1} / {kepek.length}
            </span>
          </>
        )}
      </div>

      {tobbKep && (
        <div className="flex justify-center gap-1.5 border-t border-ink-700 px-4 py-3">
          {kepek.map((k, i) => (
            <button
              key={k + i}
              type="button"
              aria-label={`${i + 1}. kép`}
              aria-current={i === jelenlegi}
              onClick={() => setIndex(i)}
              className={cx(
                'h-2 w-7 transition-colors',
                i === jelenlegi ? 'bg-blood-500' : 'bg-ink-600 hover:bg-ink-500',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
