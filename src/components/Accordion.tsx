import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/format'
import { IconChevronDown } from './Icons'

/**
 * Lenyitható elem. Alapból <details> helyett vezérelt megoldás,
 * hogy a nyíl animálható és a fejléc billentyűzettel is elérhető legyen.
 */
export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  right,
}: {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  right?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <div className="border-b border-ink-800 last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 py-4 text-left transition-colors hover:text-blood-400"
        >
          <IconChevronDown
            width={16}
            height={16}
            className={cx(
              'shrink-0 text-blood-500 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
          <span className="flex-1 text-sm font-bold text-ash-100">{title}</span>
          {right}
        </button>
      </h3>
      <div id={id} hidden={!open} className="pb-4 pl-7 text-sm leading-relaxed text-ash-300">
        {children}
      </div>
    </div>
  )
}
