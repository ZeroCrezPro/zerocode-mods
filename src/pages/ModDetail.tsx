import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getModBySlug, latestVersion, olderVersions, site } from '@/data'
import { formatDate, vLabel } from '@/lib/format'
import {
  changeClass,
  changeLabel,
  compatClass,
  compatLabel,
  statusLabel,
  statusTextClass,
} from '@/lib/labels'
import { downloadUrl } from '@/lib/download'
import { Seo } from '@/components/Seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { SmartImage } from '@/components/SmartImage'
import { Gallery } from '@/components/Lightbox'
import { Diavetites } from '@/components/Diavetites'
import { AccordionItem } from '@/components/Accordion'
import { VersionCard } from '@/components/VersionCard'
import { Badge, ExternalButton, Panel, btnClass } from '@/components/ui'
import {
  IconCheck,
  IconChevronDown,
  IconDownload,
  IconExternal,
  IconWarning,
} from '@/components/Icons'
import NotFound from './NotFound'

export default function ModDetail() {
  const { slug } = useParams()
  const mod = slug ? getModBySlug(slug) : undefined
  const [showOlder, setShowOlder] = useState(false)

  if (!mod) return <NotFound />

  const latest = latestVersion(mod)
  const older = olderVersions(mod)
  const path = `/modok/${mod.slug}`

  // Ha a mod ugyanazt a nevet kapta, mint a játék, ne ismételjük meg.
  const jatekNeve = mod.game && mod.game !== mod.name ? mod.game : null

  return (
    <>
      <Seo
        title={`${mod.name} - Letöltés | ${site.name}`}
        description={mod.shortDescription}
        path={path}
        image={mod.banner || mod.cover}
        type="article"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: mod.name,
            applicationCategory: 'GameApplication',
            operatingSystem: mod.platform,
            softwareVersion: latest?.version,
            datePublished: mod.createdAt,
            dateModified: latest?.releaseDate,
            url: site.url + path,
            description: mod.shortDescription,
            author: { '@type': 'Person', name: mod.author },
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'HUF' },
            downloadUrl: latest ? downloadUrl(latest.download) : undefined,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: mod.faq.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Főoldal', item: site.url + '/' },
              { '@type': 'ListItem', position: 2, name: 'Modok', item: site.url + '/modok' },
              { '@type': 'ListItem', position: 3, name: mod.name, item: site.url + path },
            ],
          },
        ]}
      />

      {/* ---------- Fejléc / banner ---------- */}
      <section className="relative overflow-hidden border-b border-ink-700">
        <div className="absolute inset-0" aria-hidden>
          <SmartImage
            src={mod.banner || mod.cover}
            alt=""
            ratio="h-full"
            className="h-full"
            eager
            imgClassName="opacity-15 blur-[2px]"
            dekoracio
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/88 to-ink-950/55" />
        </div>

        <div className="zc-container relative py-10 sm:py-14">
          <Breadcrumbs
            items={[
              { label: 'Főoldal', to: '/' },
              { label: 'Modok', to: '/modok' },
              { label: mod.name },
            ]}
          />

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
            <SmartImage
              src={mod.icon || mod.cover}
              alt={`${mod.name} ikon`}
              ratio="aspect-square"
              eager
              fallbackText={mod.name}
              className="w-20 shrink-0 border border-ink-600 sm:w-28"
            />

            <div className="min-w-0 flex-1">
              {jatekNeve && <p className="zc-label text-blood-400">{jatekNeve}</p>}
              <h1 className="mt-2 text-3xl leading-none font-black tracking-tighter uppercase sm:text-5xl">
                {mod.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-ash-300 sm:text-base">
                {mod.shortDescription}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {mod.tags.map((t) => (
                  <Link key={t} to={`/modok?tag=${encodeURIComponent(t)}`}>
                    <Badge className="border-ink-600 bg-ink-800 text-ash-300 transition-colors hover:border-blood-600 hover:text-ash-100">
                      {t}
                    </Badge>
                  </Link>
                ))}
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap">
                <div>
                  <dt className="zc-label text-ash-400">Állapot</dt>
                  <dd className={`mt-1 text-sm font-semibold ${statusTextClass[mod.status]}`}>
                    {statusLabel[mod.status]}
                  </dd>
                </div>
                <div>
                  <dt className="zc-label text-ash-400">Aktuális verzió</dt>
                  <dd className="mt-1 font-mono text-lg font-black text-ash-100">
                    {latest ? vLabel(latest.version) : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="zc-label text-ash-400">Frissítve</dt>
                  <dd className="mt-1 text-sm text-ash-200">
                    {latest ? formatDate(latest.releaseDate) : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="zc-label text-ash-400">Platform</dt>
                  <dd className="mt-1 text-sm text-ash-200">{mod.platform}</dd>
                </div>
                <div>
                  <dt className="zc-label text-ash-400">Készítő</dt>
                  <dd className="mt-1 text-sm text-ash-200">{mod.author}</dd>
                </div>
                <div>
                  <dt className="zc-label text-ash-400">Méret</dt>
                  <dd className="mt-1 text-sm text-ash-200">{latest?.size ?? '-'}</dd>
                </div>
              </dl>

              {latest && (
                <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                  <a
                    href={downloadUrl(latest.download)}
                    rel="noopener noreferrer"
                    className={btnClass('primary', 'lg')}
                    aria-label={`${mod.name} ${vLabel(latest.version)} letöltése`}
                  >
                    <IconDownload width={18} height={18} />
                    Letöltés &middot; {vLabel(latest.version)}
                  </a>
                  <a href="#telepites" className={btnClass('secondary', 'lg')}>
                    Telepítési útmutató
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Diavetítő a letöltés gomb és a leírás között ---------- */}
      {mod.slideshow && mod.slideshow.length > 0 && (
        <div className="zc-container pt-8 sm:pt-10">
          <Diavetites kepek={mod.slideshow} />
        </div>
      )}

      {/* ---------- Tartalom ---------- */}
      <div className="zc-container grid gap-6 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Panel title="Leírás">
            <div className="space-y-4">
              {mod.description.map((para) => (
                <p key={para.slice(0, 40)} className="text-sm leading-relaxed text-ash-300">
                  {para}
                </p>
              ))}
            </div>
          </Panel>

          <Panel title="Funkciók">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {mod.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ash-200">
                  <IconCheck
                    width={15}
                    height={15}
                    className="mt-1 shrink-0 text-blood-500"
                    aria-hidden
                  />
                  {f}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Képek" id="kepek">
            <Gallery images={mod.screenshots} />
          </Panel>

          <Panel title="Telepítés" id="telepites">
            <ol className="space-y-3">
              {mod.installationSteps.map((step, i) => (
                <li
                  key={step.title}
                  className="flex gap-4 border border-ink-800 bg-ink-850/60 p-3.5"
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center bg-blood-600 font-mono text-sm font-black text-white"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ash-100">{step.title}</span>
                    {step.detail && (
                      <span className="mt-1 block text-sm text-ash-400">{step.detail}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <div className="grid gap-6 sm:grid-cols-2">
            <Panel title="Követelmények">
              <dl className="divide-y divide-ink-800">
                {mod.requirements.map((r) => (
                  <div key={r.label} className="flex justify-between gap-4 py-2.5 first:pt-0">
                    <dt className="text-sm text-ash-400">{r.label}</dt>
                    <dd className="text-right text-sm font-semibold text-ash-100">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Kompatibilitás">
              <ul className="divide-y divide-ink-800">
                {mod.compatibility.map((c) => (
                  <li key={c.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                    <span className="min-w-0">
                      <span className="block text-sm text-ash-100">{c.label}</span>
                      {c.note && <span className="block text-xs text-ash-400">{c.note}</span>}
                    </span>
                    <Badge className={compatClass[c.state]}>{compatLabel[c.state]}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {/* Figyelmeztetés */}
          <aside className="flex gap-4 border border-amber-600/40 bg-amber-500/8 p-4 sm:p-5">
            <IconWarning
              width={22}
              height={22}
              className="mt-0.5 shrink-0 text-amber-400"
              aria-hidden
            />
            <div>
              <h2 className="zc-label text-amber-300">Fontos</h2>
              <p className="mt-2 text-sm leading-relaxed text-ash-300">
                Mindig ellenőrizd, hogy a mod verziója kompatibilis-e a telepített
                játékverzióddal. Javasolt biztonsági másolatot készíteni a módosított
                játékfájlokról, mielőtt bármit telepítesz.
              </p>
            </div>
          </aside>

          {/* Letöltések */}
          <Panel title="Letölthető verziók" id="letoltesek" bodyClassName="space-y-4">
            {latest && <VersionCard mod={mod} version={latest} latest />}

            {older.length > 0 && (
              <div className="border border-ink-800">
                <button
                  type="button"
                  onClick={() => setShowOlder((v) => !v)}
                  aria-expanded={showOlder}
                  aria-controls="regebbi-verziok"
                  className="flex w-full items-center gap-3 bg-ink-850 px-4 py-3 text-left transition-colors hover:bg-ink-800"
                >
                  <IconChevronDown
                    width={16}
                    height={16}
                    className={`shrink-0 text-blood-500 transition-transform duration-200 ${
                      showOlder ? 'rotate-180' : ''
                    }`}
                  />
                  <span className="zc-label flex-1 text-ash-200">Régebbi verziók</span>
                  <span className="font-mono text-xs text-ash-400">{older.length} db</span>
                </button>
                <div id="regebbi-verziok" hidden={!showOlder} className="space-y-3 p-3">
                  {older.map((v) => (
                    <VersionCard key={v.version} mod={mod} version={v} />
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-ash-400">
              Minden fájl a GitHub Releases oldaláról töltődik le. Nincs regisztráció, reklámoldal
              vagy linkrövidítő.
            </p>
          </Panel>

          {/* Changelog */}
          <Panel title="Változási napló" id="valtozasok" bodyClassName="space-y-5">
            {mod.changelog.map((entry) => (
              <article key={entry.version} className="border-l-2 border-blood-600/50 pl-4">
                <header className="flex flex-wrap items-baseline gap-3">
                  <h3 className="font-mono text-base font-black text-ash-100">
                    {vLabel(entry.version)}
                  </h3>
                  <time dateTime={entry.date} className="text-xs text-ash-400">
                    {formatDate(entry.date)}
                  </time>
                </header>
                <div className="mt-3 space-y-3">
                  {entry.groups.map((g) => (
                    <div key={g.kind}>
                      <Badge className={changeClass[g.kind]}>{changeLabel[g.kind]}</Badge>
                      <ul className="mt-2 space-y-1.5">
                        {g.items.map((it) => (
                          <li key={it} className="flex gap-2.5 text-sm text-ash-300">
                            <span aria-hidden className="mt-2 block h-1 w-1 shrink-0 bg-ink-500" />
                            {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </Panel>

          {/* GYIK */}
          <Panel title="Gyakori kérdések" id="gyik" bodyClassName="py-0 sm:py-0">
            {mod.faq.map((f, i) => (
              <AccordionItem key={f.question} title={f.question} defaultOpen={i === 0}>
                {f.answer}
              </AccordionItem>
            ))}
          </Panel>
        </div>

        {/* ---------- Oldalsáv ---------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {latest && (
            <div className="border border-blood-600/50 bg-ink-900 p-4">
              <p className="zc-label text-ash-400">Legfrissebb kiadás</p>
              <p className="mt-1 font-mono text-2xl font-black text-ash-100">
                {vLabel(latest.version)}
              </p>
              <p className="mt-0.5 text-xs text-ash-400">{formatDate(latest.releaseDate)}</p>
              <a
                href={downloadUrl(latest.download)}
                rel="noopener noreferrer"
                className={btnClass('primary', 'md', 'mt-4 w-full')}
              >
                <IconDownload width={16} height={16} />
                Letöltés
              </a>
              <a href="#letoltesek" className={btnClass('ghost', 'sm', 'mt-1.5 w-full')}>
                Összes verzió
              </a>
            </div>
          )}

          <nav aria-label="Oldalon belüli navigáció" className="border border-ink-700 bg-ink-900">
            <p className="zc-label border-b border-ink-700 bg-ink-850 px-4 py-3 text-ash-100">
              Ezen az oldalon
            </p>
            <ul className="p-2">
              {[
                { href: '#telepites', label: 'Telepítés' },
                { href: '#kepek', label: 'Képek' },
                { href: '#letoltesek', label: 'Letölthető verziók' },
                { href: '#valtozasok', label: 'Változási napló' },
                { href: '#gyik', label: 'Gyakori kérdések' },
              ].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="block px-2 py-2 text-sm text-ash-400 transition-colors hover:text-blood-400"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {mod.game && (
            <div className="border border-ink-700 bg-ink-900 p-4">
              <p className="zc-label text-ash-400">Melyik játékhoz</p>
              <p className="mt-2 text-sm font-bold text-ash-100">{mod.game}</p>
            </div>
          )}

          {mod.externalLinks && mod.externalLinks.length > 0 && (
            <div className="border border-ink-700 bg-ink-900 p-4">
              <p className="zc-label mb-3 text-ash-400">Hasznos linkek</p>
              <div className="flex flex-col gap-2">
                {mod.externalLinks.map((l) => (
                  <ExternalButton
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    variant="secondary"
                    size="sm"
                  >
                    <IconExternal width={14} height={14} />
                    {l.label}
                  </ExternalButton>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
