import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { allTags, getGameById, lastUpdated, mods, site } from '@/data'
import type { Mod } from '@/data/types'
import { matches, normalize } from '@/lib/search'
import { cx } from '@/lib/format'
import { Seo, pageTitle } from '@/components/Seo'
import { ModCard } from '@/components/ModCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Empty } from '@/components/Empty'
import { IconSearch } from '@/components/Icons'

type SortKey = 'frissitett' | 'legujabb' | 'az' | 'za'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'frissitett', label: 'Legutóbb frissített' },
  { key: 'legujabb', label: 'Legújabb' },
  { key: 'az', label: 'Név A-Z' },
  { key: 'za', label: 'Név Z-A' },
]

function haystack(mod: Mod): string {
  const game = getGameById(mod.gameId)
  return normalize(
    [
      mod.name,
      game?.name ?? '',
      game?.fullName ?? '',
      mod.shortDescription,
      mod.description.join(' '),
      mod.tags.join(' '),
      mod.features.join(' '),
    ].join(' '),
  )
}

export default function Mods() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const activeTag = params.get('tag') ?? ''
  const [sort, setSort] = useState<SortKey>('frissitett')

  const tags = useMemo(() => allTags(), [])

  const list = useMemo(() => {
    let out = mods.filter((m) => matches(query, haystack(m)))
    if (activeTag) out = out.filter((m) => m.tags.includes(activeTag))
    const byName = (a: Mod, b: Mod) => a.name.localeCompare(b.name, 'hu')
    switch (sort) {
      case 'az':
        return [...out].sort(byName)
      case 'za':
        return [...out].sort((a, b) => byName(b, a))
      case 'legujabb':
        return [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      default:
        return [...out].sort((a, b) => lastUpdated(b).localeCompare(lastUpdated(a)))
    }
  }, [query, activeTag, sort])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const vanTartalom = mods.length > 0

  return (
    <div className="zc-container py-10 sm:py-14">
      <Seo
        title={pageTitle('Modok')}
        description={
          vanTartalom
            ? `Az összes ZeroCode mod és eszköz egy helyen - ${mods.length} mod, telepítési útmutatóval, verziólistával és közvetlen letöltéssel.`
            : 'Az összes ZeroCode mod és eszköz egy helyen, telepítési útmutatóval, verziólistával és közvetlen letöltéssel.'
        }
        path="/modok"
      />

      <Breadcrumbs items={[{ label: 'Főoldal', to: '/' }, { label: 'Modok' }]} />

      <header className="mb-8">
        <p className="zc-label mb-2 text-blood-400">Katalógus</p>
        <h1 className="text-3xl font-black tracking-tight uppercase sm:text-4xl">Modok</h1>
        <p className="mt-3 max-w-2xl text-sm text-ash-400">
          Minden {site.author} mod és eszköz. Keress név, játék, leírás vagy címke szerint.
        </p>
      </header>

      {/* A kereső és a szűrők csak akkor jelennek meg, ha van mit szűrni. */}
      {vanTartalom && (
        <div className="mb-6 border border-ink-700 bg-ink-900 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="mod-kereso" className="sr-only">
                Keresés a modok között
              </label>
              <IconSearch
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ash-400"
                aria-hidden
              />
              <input
                id="mod-kereso"
                type="search"
                value={query}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder="Keresés modok, játékok, funkciók között..."
                className="h-11 w-full border border-ink-600 bg-ink-850 pr-3 pl-9 text-sm text-ash-100 placeholder:text-ash-400 focus:border-blood-600 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="mod-rendezes" className="sr-only">
                Rendezés
              </label>
              <select
                id="mod-rendezes"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-11 w-full border border-ink-600 bg-ink-850 px-3 text-sm text-ash-100 focus:border-blood-600 focus:outline-none sm:w-56"
              >
                {sortOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setParam('tag', '')}
                aria-pressed={!activeTag}
                className={cx(
                  'border px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase transition-colors',
                  !activeTag
                    ? 'border-blood-500 bg-blood-600 text-white'
                    : 'border-ink-600 bg-ink-850 text-ash-300 hover:border-blood-600',
                )}
              >
                Összes
              </button>
              {tags.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setParam('tag', activeTag === tag ? '' : tag)}
                  aria-pressed={activeTag === tag}
                  className={cx(
                    'border px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase transition-colors',
                    activeTag === tag
                      ? 'border-blood-500 bg-blood-600 text-white'
                      : 'border-ink-600 bg-ink-850 text-ash-300 hover:border-blood-600',
                  )}
                >
                  {tag} <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {vanTartalom && (
        <p className="mb-4 text-xs text-ash-400" role="status" aria-live="polite">
          {list.length} találat
          {query && (
            <>
              {' '}
              erre: <span className="text-ash-200">{query}</span>
            </>
          )}
          {activeTag && (
            <>
              {' '}
              &middot; címke: <span className="text-ash-200">{activeTag}</span>
            </>
          )}
        </p>
      )}

      {!vanTartalom ? (
        <Empty title="Még nincs közzétett mod.">
          Az első ZeroCode mod hamarosan érkezik. Nézz vissza később, vagy kövesd a GitHub oldalt.
        </Empty>
      ) : list.length === 0 ? (
        <Empty title="Nincs a keresésnek megfelelő mod.">
          Próbáld meg más kifejezéssel, vagy töröld a címkeszűrőt.
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((mod, i) => (
            <ModCard key={mod.id} mod={mod} eager={i < 3} />
          ))}
        </div>
      )}
    </div>
  )
}
