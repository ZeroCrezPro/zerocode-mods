import { Link } from 'react-router-dom'
import { IconChevronRight } from './Icons'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Morzsamenü" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ash-400">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <IconChevronRight width={12} height={12} className="text-ink-500" />}
            {c.to ? (
              <Link to={c.to} className="transition-colors hover:text-blood-400">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ash-200">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
