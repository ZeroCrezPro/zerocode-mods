import { useCallback, useEffect, useState } from 'react'
import { cx } from '@/lib/format'
import { IconChevronLeft, IconChevronRight } from './Icons'

/**
 * Diavetítő: egyszerre egy nagy kép, alatta a vezérlőkkel.
 *
 * A nyilak és a lapozópontok szándékosan a kép ALATT vannak, nem rajta:
 * telefonon a képre helyezett gombok kitakarták a kép egy részét.
 *
 * Csak képútvonalakat vár - a képleírást (amit a képernyőolvasó felolvas
 * és a kereső lát) a mod nevéből állítjuk elő.
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

  const nyilOsztaly =
    'flex h-11 w-11 shrink-0 items-center justify-center border border-ink-600 bg-ink-900 text-ash-200 transition-colors hover:border-blood-600 hover:text-white'

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
      {/* A kép semmivel nincs letakarva */}
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
        <div className="flex items-center justify-center gap-3 border-t border-ink-700 px-3 py-3">
          <button type="button" onClick={() => lep(-1)} aria-label="Előző kép" className={nyilOsztaly}>
            <IconChevronLeft width={20} height={20} />
          </button>

          <div className="flex flex-wrap justify-center gap-1.5">
            {kepek.map((k, i) => (
              <button
                key={k + i}
                type="button"
                aria-label={`${i + 1}. kép`}
                aria-current={i === jelenlegi}
                onClick={() => setIndex(i)}
                className={cx(
                  'h-2.5 w-7 transition-colors',
                  i === jelenlegi ? 'bg-blood-500' : 'bg-ink-600 hover:bg-ink-500',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => lep(1)}
            aria-label="Következő kép"
            className={nyilOsztaly}
          >
            <IconChevronRight width={20} height={20} />
          </button>
        </div>
      )}
    </section>
  )
}
