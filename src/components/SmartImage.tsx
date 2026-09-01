import { useState } from 'react'
import { cx } from '@/lib/format'

/**
 * Lusta betöltésű kép, hibatűrő tartalékkal.
 * Ha a fájl hiányzik vagy nem tölthető be, egy stílusos ZeroCode
 * helyőrzőt rajzol a mod/játék nevének kezdőbetűivel - így egy hiányzó
 * kép sem töri el az elrendezést.
 */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  ratio = 'aspect-[16/9]',
  eager = false,
  fallbackText,
  dekoracio = false,
}: {
  src?: string
  alt: string
  className?: string
  imgClassName?: string
  ratio?: string
  eager?: boolean
  fallbackText?: string
  /**
   * Díszítő kép (pl. elmosott háttér a fejlécben). Ha nincs kép, semmit nem
   * rajzolunk a helyére - a helyőrző betűk ott csak zavaró szellemképként
   * jelennének meg.
   */
  dekoracio?: boolean
}) {
  const [failed, setFailed] = useState(false)

  if (dekoracio && (!src || failed)) {
    return <div className={cx('bg-ink-950', ratio, className)} aria-hidden />
  }

  const initials = (fallbackText ?? alt)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className={cx('relative overflow-hidden bg-ink-850', ratio, className)}>
      {!src || failed ? (
        <div
          role="img"
          aria-label={alt}
          className="zc-diag absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-850 to-ink-950"
        >
          <span className="font-mono text-3xl font-black tracking-tight text-ink-500 select-none sm:text-4xl">
            {initials || 'ZC'}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={cx('h-full w-full object-cover', imgClassName)}
        />
      )}
    </div>
  )
}
