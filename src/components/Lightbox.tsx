import { useCallback, useEffect, useRef, useState } from 'react'
import type { Screenshot } from '@/data/types'
import { IconChevronLeft, IconChevronRight, IconClose } from './Icons'
import { SmartImage } from './SmartImage'

/**
 * Képgaléria nagyítható nézettel.
 * Billentyűzet: Esc = bezárás, balra/jobbra nyíl = léptetés.
 */
export function Gallery({ images }: { images: Screenshot[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const lastFocused = useRef<HTMLElement | null>(null)

  const close = useCallback(() => {
    setOpenIndex(null)
    lastFocused.current?.focus()
  }, [])

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((i) => (i === null ? i : (i + delta + images.length) % images.length))
    },
    [images.length],
  )

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Tab') {
        // egyszerű fókuszcsapda: a bezárás gombon tartjuk
        e.preventDefault()
        closeRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [openIndex, close, step])

  if (!images.length) {
    return <p className="text-sm text-ash-400">Ehhez a modhoz még nincsenek feltöltve képek.</p>
  }

  const current = openIndex === null ? null : images[openIndex]

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <li key={img.src}>
            <button
              type="button"
              onClick={(e) => {
                lastFocused.current = e.currentTarget
                setOpenIndex(i)
              }}
              className="group block w-full cursor-zoom-in border border-ink-700 transition-colors hover:border-blood-600"
              aria-label={`${img.caption ?? img.alt} - nagyítás`}
            >
              <SmartImage
                src={img.src}
                alt={img.alt}
                fallbackText={img.caption ?? 'ZeroCode'}
                imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
              />
              {img.caption && (
                <span className="block truncate border-t border-ink-700 bg-ink-850 px-2 py-1.5 text-left text-xs text-ash-400">
                  {img.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
          onClick={close}
        >
          <div className="flex items-center justify-between gap-4 border-b border-ink-800 px-4 py-3">
            <p className="truncate text-sm text-ash-300">
              <span className="font-mono text-ash-400">
                {(openIndex ?? 0) + 1}/{images.length}
              </span>
              {current.caption ? ` - ${current.caption}` : ''}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Bezárás"
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink-600 text-ash-200 transition-colors hover:border-blood-600 hover:text-white"
            >
              <IconClose width={18} height={18} />
            </button>
          </div>

          <div
            className="flex flex-1 items-center justify-center gap-2 p-3 sm:gap-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Előző kép"
                className="flex h-11 w-11 shrink-0 items-center justify-center border border-ink-600 bg-ink-900/80 text-ash-200 transition-colors hover:border-blood-600 hover:text-white"
              >
                <IconChevronLeft width={20} height={20} />
              </button>
            )}

            <img
              src={current.src}
              alt={current.alt}
              className="max-h-[78vh] max-w-full object-contain"
            />

            {images.length > 1 && (
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Következő kép"
                className="flex h-11 w-11 shrink-0 items-center justify-center border border-ink-600 bg-ink-900/80 text-ash-200 transition-colors hover:border-blood-600 hover:text-white"
              >
                <IconChevronRight width={20} height={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
