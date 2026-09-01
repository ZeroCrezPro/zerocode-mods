import { Link } from 'react-router-dom'
import { releaseFeed, site } from '@/data'
import { formatDate, vLabel } from '@/lib/format'
import { downloadUrl } from '@/lib/download'
import { Seo, pageTitle } from '@/components/Seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { SmartImage } from '@/components/SmartImage'
import { Badge, btnClass } from '@/components/ui'
import { IconDownload } from '@/components/Icons'
import { Empty } from '@/components/Empty'

export default function Latest() {
  const feed = releaseFeed()

  // Évekre bontva, hogy hosszú listánál is átlátható maradjon
  const byYear = feed.reduce<Record<string, typeof feed>>((acc, item) => {
    const year = item.version.releaseDate.slice(0, 4)
    ;(acc[year] ??= []).push(item)
    return acc
  }, {})
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a))

  return (
    <div className="zc-container py-10 sm:py-14">
      <Seo
        title={pageTitle('Legújabb kiadások')}
        description="A ZeroCode modok legfrissebb verziói időrendben - változáslistával és közvetlen letöltéssel."
        path="/legujabb"
      />

      <Breadcrumbs items={[{ label: 'Főoldal', to: '/' }, { label: 'Legújabb' }]} />

      <header className="mb-8">
        <p className="zc-label mb-2 text-blood-400">Idővonal</p>
        <h1 className="text-3xl font-black tracking-tight uppercase sm:text-4xl">
          Legújabb kiadások
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ash-400">
          {feed.length ? (
            <>
              Az összes {site.author} kiadás időrendben, a legfrissebbel kezdve. Összesen{' '}
              {feed.length} kiadás.
            </>
          ) : (
            <>Itt jelenik meg minden {site.author} kiadás időrendben.</>
          )}
        </p>
      </header>

      {feed.length === 0 && (
        <Empty title="Még nincs egyetlen kiadás sem.">
          Amint megjelenik az első mod, itt fog látszani a teljes kiadástörténet.
        </Empty>
      )}

      {years.map((year) => (
        <section key={year} className="mb-10">
          <h2 className="zc-label mb-4 flex items-center gap-3 text-ash-400">
            <span aria-hidden className="block h-px flex-1 bg-ink-700" />
            {year}
            <span aria-hidden className="block h-px flex-1 bg-ink-700" />
          </h2>

          <ol className="space-y-3">
            {byYear[year].map(({ mod, version }, i) => (
              <li
                key={`${mod.id}-${version.version}`}
                className="border border-ink-700 bg-ink-900 transition-colors hover:border-blood-600/60"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <SmartImage
                    src={mod.icon || mod.cover}
                    alt=""
                    ratio="aspect-square"
                    eager={i === 0}
                    fallbackText={mod.name}
                    className="w-14 shrink-0 border border-ink-700 sm:w-16"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/modok/${mod.slug}`}
                        className="text-base font-extrabold text-ash-100 transition-colors hover:text-blood-400"
                      >
                        {mod.name}
                      </Link>
                      <span className="font-mono text-sm font-black text-blood-400">
                        {vLabel(version.version)}
                      </span>
                      {version.prerelease && (
                        <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300">
                          Előzetes
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-ash-400">
                      <time dateTime={version.releaseDate}>{formatDate(version.releaseDate)}</time>
                      {version.size && <> &middot; {version.size}</>}
                      {version.type && <> &middot; {version.type}</>}
                    </p>

                    {version.changes && version.changes.length > 0 && (
                      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                        {version.changes.map((c) => (
                          <li key={c} className="flex items-center gap-2 text-xs text-ash-300">
                            <span aria-hidden className="block h-1 w-1 bg-blood-500" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Link to={`/modok/${mod.slug}`} className={btnClass('secondary', 'sm')}>
                      Megnézem
                    </Link>
                    <a
                      href={downloadUrl(version.download)}
                      rel="noopener noreferrer"
                      className={btnClass('primary', 'sm')}
                      aria-label={`${mod.name} ${vLabel(version.version)} letöltése`}
                    >
                      <IconDownload width={14} height={14} />
                      Letöltés
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
