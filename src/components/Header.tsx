import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { site } from '@/data/site'
import { quickSearch } from '@/lib/search'
import { cx } from '@/lib/format'
import { IconClose, IconGithub, IconGlobe, IconMenu, IconSearch } from './Icons'
import { SmartImage } from './SmartImage'

const nav = [
  { to: '/', label: 'Főoldal', end: true },
  { to: '/modok', label: 'Modok' },
  { to: '/nevjegy', label: 'Névjegy' },
]

function Brand() {
  return (
    <Link
      to="/"
      className="group flex items-center gap-3"
      aria-label={`${site.name} - főoldal`}
    >
      {site.logo ? (
        <img
          src={site.logo}
          alt=""
          aria-hidden
          className="h-10 w-10 shrink-0 object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="relative flex h-10 w-10 shrink-0 items-center justify-center border border-blood-600/60 bg-blood-600/10 font-mono text-base font-black text-blood-400 transition-colors group-hover:bg-blood-600 group-hover:text-white"
        >
          Z
          <span className="absolute -right-px -bottom-px h-2 w-2 bg-blood-500" />
        </span>
      )}
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-black tracking-[0.18em] text-ash-100">
          {site.brandTop}
        </span>
        <span className="mt-1 text-[10px] font-bold tracking-[0.42em] text-blood-400">
          {site.brandBottom}
        </span>
      </span>
    </Link>
  )
}

function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const boxRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const results = query.trim() ? quickSearch(query, 7) : []

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    setQuery('')
    onNavigate?.()
    navigate(href)
  }

  const submit = () => {
    if (results[active]) return go(results[active].href)
    if (query.trim()) {
      setOpen(false)
      onNavigate?.()
      navigate(`/modok?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Keresés modok és játékok között
      </label>
      <IconSearch
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ash-400"
        aria-hidden
      />
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder="Keresés..."
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        className="h-10 w-full border border-ink-600 bg-ink-850 pr-3 pl-9 text-sm text-ash-100 placeholder:text-ash-400 focus:border-blood-600 focus:outline-none"
      />

      {open && query.trim() !== '' && (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 max-h-[70vh] overflow-y-auto border border-ink-600 bg-ink-900 shadow-2xl shadow-black/60"
        >
          {results.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ash-400">
              Nincs találat erre: <span className="text-ash-200">{query}</span>
            </p>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={r.href}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r.href)}
                    className={cx(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      i === active ? 'bg-ink-800' : 'hover:bg-ink-850',
                    )}
                  >
                    <SmartImage
                      src={r.image}
                      alt=""
                      ratio="aspect-square"
                      className="h-9 w-9 shrink-0 border border-ink-700"
                      fallbackText={r.title}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ash-100">
                        {r.title}
                      </span>
                      <span className="block truncate text-xs text-ash-400">{r.subtitle}</span>
                    </span>
                    <span className="zc-label shrink-0 text-ash-400">Mod</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
    setMobileSearch(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      'relative px-1 py-2 text-[13px] font-bold tracking-[0.08em] uppercase transition-colors',
      isActive ? 'text-ash-100' : 'text-ash-400 hover:text-ash-100',
      isActive &&
        'after:absolute after:-bottom-px after:left-0 after:h-[2px] after:w-full after:bg-blood-500',
    )

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/92 backdrop-blur-md">
      <div className="zc-container flex h-16 items-center gap-4 lg:h-[72px]">
        <Brand />

        <nav aria-label="Fő navigáció" className="ml-4 hidden items-center gap-6 lg:flex">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden w-56 xl:block">
            <SearchBox />
          </div>

          <button
            type="button"
            onClick={() => setMobileSearch((v) => !v)}
            aria-expanded={mobileSearch}
            aria-label="Keresés megnyitása"
            className="flex h-10 w-10 items-center justify-center border border-ink-700 text-ash-300 transition-colors hover:border-blood-600 hover:text-ash-100 xl:hidden"
          >
            {mobileSearch ? <IconClose /> : <IconSearch />}
          </button>

          <a
            href={`https://github.com/${site.githubUser}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ZeroCode a GitHubon"
            title="GitHub"
            className="hidden h-10 w-10 items-center justify-center border border-ink-700 text-ash-300 transition-colors hover:border-blood-600 hover:text-ash-100 sm:flex"
          >
            <IconGithub width={18} height={18} />
          </a>

          <button
            type="button"
            title="Nyelv: magyar (további nyelvek hamarosan)"
            aria-label="Nyelvválasztó - jelenleg magyar"
            className="hidden h-10 items-center gap-1.5 border border-ink-700 px-2.5 text-ash-300 transition-colors hover:border-blood-600 hover:text-ash-100 sm:flex"
          >
            <IconGlobe width={16} height={16} />
            <span className="text-[11px] font-bold tracking-widest">HU</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobil-menu"
            aria-label={menuOpen ? 'Menü bezárása' : 'Menü megnyitása'}
            className="flex h-10 w-10 items-center justify-center border border-ink-700 text-ash-200 transition-colors hover:border-blood-600 lg:hidden"
          >
            {menuOpen ? <IconClose width={18} height={18} /> : <IconMenu width={18} height={18} />}
          </button>
        </div>
      </div>

      {mobileSearch && (
        <div className="border-t border-ink-700 bg-ink-900 px-4 py-3 xl:hidden">
          <SearchBox onNavigate={() => setMobileSearch(false)} />
        </div>
      )}

      {menuOpen && (
        <nav
          id="mobil-menu"
          aria-label="Mobil navigáció"
          className="border-t border-ink-700 bg-ink-900 lg:hidden"
        >
          <ul className="zc-container flex flex-col py-2">
            {nav.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center justify-between border-b border-ink-800 py-3.5 text-sm font-bold tracking-[0.08em] uppercase',
                      isActive ? 'text-blood-400' : 'text-ash-200',
                    )
                  }
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
            <li>
              <a
                href={`https://github.com/${site.githubUser}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-3.5 text-sm font-bold tracking-[0.08em] text-ash-200 uppercase"
              >
                <IconGithub width={16} height={16} /> GitHub
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
