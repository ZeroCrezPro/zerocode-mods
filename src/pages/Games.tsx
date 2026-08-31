import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { allCategories, gameLastUpdated, games, modCountForGame } from '@/data'
import type { Game } from '@/data/types'
import { matches, normalize } from '@/lib/search'
import { cx } from '@/lib/format'
import { Seo, pageTitle } from '@/components/Seo'
import { GameCard } from '@/components/GameCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Empty } from '@/components/Empty'
import { IconSearch } from '@/components/Icons'

type SortKey = 'az' | 'za' | 'legujabb' | 'legtobb-mod' | 'frissitett'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'az', label: 'Név A-Z' },
  { key: 'za', label: 'Név Z-A' },
  { key: 'legujabb', label: 'Legújabb' },
  { key: 'legtobb-mod', label: 'Legtöbb mod' },
  { key: 'frissitett', label: 'Legutóbb frissített' },
]

function haystack(game: Game): string {
  return normalize(
    [
      game.name,
      game.fullName,
      game.shortDescription,
      game.description.join(' '),
      game.categories.join(' '),
      game.developer ?? '',
      game.publisher ?? '',
    ].join(' '),
  )
}

export default function Games() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const category = params.get('kategoria') ?? ''
  const [sort, setSort] = useState<SortKey>('az')

  const categories = useMemo(() => allCategories(), [])

  const list = useMemo(() => {
    let out = games.filter((g) => matches(query, haystack(g)))
    if (category) out = out.filter((g) => g.categories.includes(category))
    const byName = (a: Game, b: Game) => a.name.localeCompare(b.name, 'hu')
    switch (sort) {
      case 'za':
        return [...out].sort((a, b) => byName(b, a))
      case 'legujabb':
        return [...out].sort((a, b) => b.releaseYear - a.releaseYear || byName(a, b))
      case 'legtobb-mod':
        return [...out].sort((a, b) => modCountForGame(b) - modCountForGame(a) || byName(a, b))
      case 'frissitett':
        return [...out].sort((a, b) =>
          (gameLastUpdated(b) ?? '').localeCompare(gameLastUpdated(a) ?? ''),
        )
      default:
        return [...out].sort(byName)
    }
  }, [query, category, sort])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="zc-container py-10 sm:py-14">
      <Seo
        title={pageTitle('Játékok')}
        description={`A ZeroCode Mods által támogatott játékok listája - ${games.length} cím, hozzájuk tartozó modokkal és eszközökkel.`}
        path="/jatekok"
      />

      <Breadcrumbs items={[{ label: 'Főoldal', to: '/' }, { label: 'Játékok' }]} />

      <header className="mb-8">
        <p className="zc-label mb-2 text-blood-400">Támogatott címek</p>
        <h1 className="text-3xl font-black tracking-tight uppercase sm:text-4xl">Játékok</h1>
        <p className="mt-3 max-w-2xl text-sm text-ash-400">
          Ezekhez a játékokhoz készülnek ZeroCode modok. Nyisd meg valamelyiket a hozzá tartozó
          modok listájáért.
        </p>
      </header>

      <div className="mb-6 border border-ink-700 bg-ink-900 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="jatek-kereso" className="sr-only">
              Keresés a játékok között
            </label>
            <IconSearch
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ash-400"
              aria-hidden
            />
            <input
              id="jatek-kereso"
              type="search"
              value={query}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Keresés játékok között..."
              className="h-11 w-full border border-ink-600 bg-ink-850 pr-3 pl-9 text-sm text-ash-100 placeholder:text-ash-400 focus:border-blood-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="jatek-rendezes" className="sr-only">
              Rendezés
            </label>
            <select
              id="jatek-rendezes"
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

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParam('kategoria', '')}
            aria-pressed={!category}
            className={cx(
              'border px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase transition-colors',
              !category
                ? 'border-blood-500 bg-blood-600 text-white'
                : 'border-ink-600 bg-ink-850 text-ash-300 hover:border-blood-600',
            )}
          >
            Összes kategória
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setParam('kategoria', category === c ? '' : c)}
              aria-pressed={category === c}
              className={cx(
                'border px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase transition-colors',
                category === c
                  ? 'border-blood-500 bg-blood-600 text-white'
                  : 'border-ink-600 bg-ink-850 text-ash-300 hover:border-blood-600',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-xs text-ash-400" role="status" aria-live="polite">
        {list.length} játék
      </p>

      {list.length === 0 ? (
        <Empty title="Nincs a keresésnek megfelelő játék.">
          Próbáld más kifejezéssel, vagy törölj a szűrőkből.
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g, i) => (
            <GameCard key={g.id} game={g} eager={i < 3} />
          ))}
        </div>
      )}
    </div>
  )
}
