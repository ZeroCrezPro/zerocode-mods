import { useParams } from 'react-router-dom'
import { gameLastUpdated, getGameBySlug, getModsByGameId, site } from '@/data'
import { formatDate } from '@/lib/format'
import { Seo, pageTitle } from '@/components/Seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ModCard } from '@/components/ModCard'
import { SmartImage } from '@/components/SmartImage'
import { Badge, ExternalButton, SectionHead } from '@/components/ui'
import { Empty } from '@/components/Empty'
import { IconExternal } from '@/components/Icons'
import NotFound from './NotFound'

export default function GameDetail() {
  const { slug } = useParams()
  const game = slug ? getGameBySlug(slug) : undefined

  if (!game) return <NotFound />

  const gameMods = getModsByGameId(game.id)
  const updated = gameLastUpdated(game)
  const path = `/jatekok/${game.slug}`

  return (
    <>
      <Seo
        title={pageTitle(`${game.name} modok`)}
        description={`${game.fullName} - ${gameMods.length} ZeroCode mod és eszköz. ${game.shortDescription}`}
        path={path}
        image={game.banner ?? game.cover}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'VideoGame',
            name: game.fullName,
            url: site.url + path,
            gamePlatform: game.platforms,
            applicationCategory: 'Game',
            datePublished: String(game.releaseYear),
            publisher: game.publisher ? { '@type': 'Organization', name: game.publisher } : undefined,
            author: game.developer ? { '@type': 'Organization', name: game.developer } : undefined,
            description: game.shortDescription,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Főoldal', item: site.url + '/' },
              { '@type': 'ListItem', position: 2, name: 'Játékok', item: site.url + '/jatekok' },
              { '@type': 'ListItem', position: 3, name: game.name, item: site.url + path },
            ],
          },
        ]}
      />

      {/* Banner */}
      <section className="relative overflow-hidden border-b border-ink-700">
        <div className="absolute inset-0" aria-hidden>
          <SmartImage
            src={game.banner ?? game.cover}
            alt=""
            ratio="h-full"
            className="h-full"
            eager
            imgClassName="opacity-25 blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/60" />
        </div>

        <div className="zc-container relative py-10 sm:py-14">
          <Breadcrumbs
            items={[
              { label: 'Főoldal', to: '/' },
              { label: 'Játékok', to: '/jatekok' },
              { label: game.name },
            ]}
          />

          <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
            <SmartImage
              src={game.cover}
              alt={`${game.fullName} borító`}
              ratio="aspect-[3/4]"
              eager
              fallbackText={game.name}
              className="w-40 shrink-0 border border-ink-600 shadow-2xl shadow-black/50 sm:w-52"
            />

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl leading-none font-black tracking-tighter uppercase sm:text-5xl">
                {game.name}
              </h1>
              <p className="mt-2 text-base text-ash-300 sm:text-lg">{game.fullName}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {game.platforms.map((p) => (
                  <Badge key={p} className="border-blood-600/40 bg-blood-600/10 text-blood-300">
                    {p}
                  </Badge>
                ))}
                <Badge>{game.releaseYear}</Badge>
                {game.categories.map((c) => (
                  <Badge key={c}>{c}</Badge>
                ))}
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ash-300">
                {game.shortDescription}
              </p>

              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-xs">
                {game.developer && (
                  <div>
                    <dt className="zc-label text-ash-400">Fejlesztő</dt>
                    <dd className="mt-0.5 text-sm text-ash-200">{game.developer}</dd>
                  </div>
                )}
                {game.publisher && (
                  <div>
                    <dt className="zc-label text-ash-400">Kiadó</dt>
                    <dd className="mt-0.5 text-sm text-ash-200">{game.publisher}</dd>
                  </div>
                )}
                <div>
                  <dt className="zc-label text-ash-400">ZeroCode modok</dt>
                  <dd className="mt-0.5 text-sm text-ash-200">{gameMods.length} db</dd>
                </div>
                <div>
                  <dt className="zc-label text-ash-400">Utolsó frissítés</dt>
                  <dd className="mt-0.5 text-sm text-ash-200">
                    {updated ? formatDate(updated) : 'nincs adat'}
                  </dd>
                </div>
              </dl>

              {game.externalLinks && game.externalLinks.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {game.externalLinks.map((l) => (
                    <ExternalButton
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      variant={l.primary ? 'primary' : 'secondary'}
                      size="sm"
                    >
                      <IconExternal width={14} height={14} />
                      {l.label}
                    </ExternalButton>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="zc-container py-12 sm:py-16">
        <section className="mb-12">
          <SectionHead eyebrow="A játékról" title="Ismertető" />
          <div className="max-w-3xl space-y-4">
            {game.description.map((para) => (
              <p key={para.slice(0, 40)} className="text-sm leading-relaxed text-ash-300">
                {para}
              </p>
            ))}
          </div>
        </section>

        <section>
          <SectionHead eyebrow={game.name} title="ZeroCode modok ehhez a játékhoz" />
          {gameMods.length === 0 ? (
            <Empty title="Ehhez a játékhoz még nincs kiadott mod.">
              Dolgozom rajta - nézz vissza később, vagy kövesd a GitHub oldalt.
            </Empty>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gameMods.map((m, i) => (
                <ModCard key={m.id} mod={m} eager={i < 3} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
