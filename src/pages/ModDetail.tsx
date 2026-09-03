import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getModBySlug, latestVersion, olderVersions, site } from '@/data'
import { formatDate, vLabel } from '@/lib/format'
import { statusLabel, statusTextClass } from '@/lib/labels'
import { downloadUrl } from '@/lib/download'
import { csakSzoveg } from '@/lib/gazdagSzoveg'
import { Seo } from '@/components/Seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { SmartImage } from '@/components/SmartImage'
import { Diavetites } from '@/components/Diavetites'
import { AccordionItem } from '@/components/Accordion'
import { VersionCard } from '@/components/VersionCard'
import { Felirat, Szoveg } from '@/components/Szoveg'
import { Badge, ExternalButton, Panel, btnClass } from '@/components/ui'
import { IconCheck, IconChevronDown, IconDownload, IconExternal } from '@/components/Icons'
import NotFound from './NotFound'

export default function ModDetail() {
  const { slug } = useParams()
  const mod = slug ? getModBySlug(slug) : undefined
  const [showOlder, setShowOlder] = useState(false)

  if (!mod) return <NotFound />

  const latest = latestVersion(mod)
  const older = olderVersions(mod)
  const path = `/modok/${mod.slug}`

  // A címsorban és a keresőnek szánt szövegekben nem lehet formázás.
  const nev = csakSzoveg(mod.name)
  const rovidLeiras = csakSzoveg(mod.shortDescription)

  // Ha a mod ugyanazt a nevet kapta, mint a játék, ne ismételjük meg.
  const jatekNeve = mod.game && csakSzoveg(mod.game) !== nev ? mod.game : null

  return (
    <>
      <Seo
        title={`${nev} - Letöltés | ${site.name}`}
        description={rovidLeiras}
        path={path}
        image={mod.banner || mod.cover}
        type="article"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: nev,
            applicationCategory: 'GameApplication',
            operatingSystem: csakSzoveg(mod.platform),
            softwareVersion: latest?.version,
            datePublished: mod.createdAt,
            dateModified: latest?.releaseDate,
            url: site.url + path,
            description: rovidLeiras,
            author: { '@type': 'Person', name: csakSzoveg(mod.author) },
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'HUF' },
            downloadUrl: latest ? downloadUrl(latest.download) : undefined,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: mod.faq.map((f) => ({
              '@type': 'Question',
              name: csakSzoveg(f.question),
              acceptedAnswer: { '@type': 'Answer', text: csakSzoveg(f.answer) },
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Főoldal', item: site.url + '/' },
              { '@type': 'ListItem', position: 2, name: 'Modok', item: site.url + '/modok' },
              { '@type': 'ListItem', position: 3, name: nev, item: site.url + path },
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
            items={[{ label: 'Főoldal', to: '/' }, { label: 'Modok', to: '/modok' }, { label: nev }]}
          />

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
            <SmartImage
              src={mod.icon || mod.cover}
              alt={`${nev} ikon`}
              ratio="aspect-square"
              eager
              fallbackText={nev}
              className="w-20 shrink-0 border border-ink-600 sm:w-28"
            />

            <div className="min-w-0 flex-1">
              {jatekNeve && (
                <Szoveg
                  elem="p"
                  className="zc-label text-blood-400"
                  ertek={jatekNeve}
                  mezo={`${mod.slug}:game`}
                />
              )}
              <Szoveg
                elem="h1"
                className="mt-2 text-3xl leading-none font-black tracking-tighter uppercase sm:text-5xl"
                ertek={mod.name}
                mezo={`${mod.slug}:name`}
              />
              <Szoveg
                elem="p"
                className="mt-3 max-w-2xl text-sm text-ash-300 sm:text-base"
                ertek={mod.shortDescription}
                mezo={`${mod.slug}:shortDescription`}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {/* A címke szűrésre és URL-be is megy, ezért nem formázható. */}
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
                  <Felirat elem="dt" className="zc-label text-ash-400" kulcs="mod.allapot" alap="Állapot" />
                  <dd className={`mt-1 text-sm font-semibold ${statusTextClass[mod.status]}`}>
                    <Felirat
                      kulcs={`mod.allapot.${mod.status}`}
                      alap={statusLabel[mod.status]}
                    />
                  </dd>
                </div>
                <div>
                  <Felirat
                    elem="dt"
                    className="zc-label text-ash-400"
                    kulcs="mod.verzio"
                    alap="Aktuális verzió"
                  />
                  <dd className="mt-1 font-mono text-lg font-black text-ash-100">
                    {latest ? vLabel(latest.version) : '-'}
                  </dd>
                </div>
                <div>
                  <Felirat
                    elem="dt"
                    className="zc-label text-ash-400"
                    kulcs="mod.frissitve"
                    alap="Frissítve"
                  />
                  <dd className="mt-1 text-sm text-ash-200">
                    {latest ? formatDate(latest.releaseDate) : '-'}
                  </dd>
                </div>
                <div>
                  <Felirat
                    elem="dt"
                    className="zc-label text-ash-400"
                    kulcs="mod.platform"
                    alap="Platform"
                  />
                  <Szoveg
                    elem="dd"
                    className="mt-1 text-sm text-ash-200"
                    ertek={mod.platform}
                    mezo={`${mod.slug}:platform`}
                  />
                </div>
                <div>
                  <Felirat
                    elem="dt"
                    className="zc-label text-ash-400"
                    kulcs="mod.keszito"
                    alap="Készítő"
                  />
                  <Szoveg
                    elem="dd"
                    className="mt-1 text-sm text-ash-200"
                    ertek={mod.author}
                    mezo={`${mod.slug}:author`}
                  />
                </div>
                <div>
                  <Felirat elem="dt" className="zc-label text-ash-400" kulcs="mod.meret" alap="Méret" />
                  <dd className="mt-1 text-sm text-ash-200">{latest?.size ?? '-'}</dd>
                </div>
              </dl>

              {latest && (
                <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                  <a
                    href={downloadUrl(latest.download)}
                    rel="noopener noreferrer"
                    className={btnClass('primary', 'lg')}
                    aria-label={`${nev} ${vLabel(latest.version)} letöltése`}
                  >
                    <IconDownload width={18} height={18} />
                    <Felirat kulcs="gomb.letoltes" alap="Letöltés" /> &middot;{' '}
                    {vLabel(latest.version)}
                  </a>
                  <a href="#telepites" className={btnClass('secondary', 'lg')}>
                    <Felirat kulcs="gomb.utmutato" alap="Telepítési útmutató" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Tartalom ---------- */}
      {/*
        A diavetítő a bal oszlop tetején van, nem külön sávban: így a jobb
        oldali letöltő doboz is fel tud jönni mellé, nem csak a leírás mellé.
      */}
      <div className="zc-container grid gap-6 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {(mod.video || (mod.slideshow && mod.slideshow.length > 0)) && (
            <Diavetites kepek={mod.slideshow ?? []} video={mod.video} nev={nev} />
          )}

          <Panel title="Leírás" cimKulcs="szekcio.leiras">
            <div className="space-y-4">
              {mod.description.map((para, i) => (
                <Szoveg
                  key={para.slice(0, 40)}
                  elem="p"
                  className="text-sm leading-relaxed text-ash-300"
                  ertek={para}
                  mezo={`${mod.slug}:description:${i}`}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Funkciók" cimKulcs="szekcio.funkciok">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {mod.features.map((f, i) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ash-200">
                  <IconCheck
                    width={15}
                    height={15}
                    className="mt-1 shrink-0 text-blood-500"
                    aria-hidden
                  />
                  <Szoveg ertek={f} mezo={`${mod.slug}:features:${i}`} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Telepítés" id="telepites" cimKulcs="szekcio.telepites">
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
                    <Szoveg
                      elem="span"
                      className="block text-sm font-bold text-ash-100"
                      ertek={step.title}
                      mezo={`${mod.slug}:installationSteps:${i}:title`}
                    />
                    {step.detail && (
                      <Szoveg
                        elem="span"
                        className="mt-1 block text-sm text-ash-400"
                        ertek={step.detail}
                        mezo={`${mod.slug}:installationSteps:${i}:detail`}
                      />
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          {/* Letöltések */}
          <Panel
            title="Letölthető verziók"
            id="letoltesek"
            bodyClassName="space-y-4"
            cimKulcs="szekcio.letoltesek"
          >
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
                  <Felirat
                    elem="span"
                    className="zc-label flex-1 text-ash-200"
                    kulcs="mod.regebbi"
                    alap="Régebbi verziók"
                  />
                  <span className="font-mono text-xs text-ash-400">{older.length} db</span>
                </button>
                <div id="regebbi-verziok" hidden={!showOlder} className="space-y-3 p-3">
                  {older.map((v) => (
                    <VersionCard key={v.version} mod={mod} version={v} />
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* GYIK */}
          <Panel
            title="Gyakori kérdések"
            id="gyik"
            bodyClassName="py-0 sm:py-0"
            cimKulcs="szekcio.gyik"
          >
            {mod.faq.map((f, i) => (
              <AccordionItem
                key={f.question}
                title={<Szoveg ertek={f.question} mezo={`${mod.slug}:faq:${i}:question`} />}
                defaultOpen={i === 0}
              >
                <Szoveg elem="div" ertek={f.answer} mezo={`${mod.slug}:faq:${i}:answer`} />
              </AccordionItem>
            ))}
          </Panel>
        </div>

        {/* ---------- Oldalsáv ---------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {latest && (
            <div className="border border-blood-600/50 bg-ink-900 p-4">
              <Felirat
                elem="p"
                className="zc-label text-ash-400"
                kulcs="mod.legfrissebb"
                alap="Legfrissebb kiadás"
              />
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
                <Felirat kulcs="gomb.letoltes" alap="Letöltés" />
              </a>
              <a href="#letoltesek" className={btnClass('ghost', 'sm', 'mt-1.5 w-full')}>
                <Felirat kulcs="gomb.osszesVerzio" alap="Összes verzió" />
              </a>
            </div>
          )}

          {mod.game && (
            <div className="border border-ink-700 bg-ink-900 p-4">
              <Felirat
                elem="p"
                className="zc-label text-ash-400"
                kulcs="mod.melyikJatek"
                alap="Melyik játékhoz"
              />
              <Szoveg
                elem="p"
                className="mt-2 text-sm font-bold text-ash-100"
                ertek={mod.game}
                mezo={`${mod.slug}:game`}
              />
            </div>
          )}

          {mod.externalLinks && mod.externalLinks.length > 0 && (
            <div className="border border-ink-700 bg-ink-900 p-4">
              <Felirat
                elem="p"
                className="zc-label mb-3 text-ash-400"
                kulcs="mod.hasznosLinkek"
                alap="Hasznos linkek"
              />
              <div className="flex flex-col gap-2">
                {mod.externalLinks.map((l, i) => (
                  <ExternalButton
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    variant="secondary"
                    size="sm"
                  >
                    <IconExternal width={14} height={14} />
                    <Szoveg ertek={l.label} mezo={`${mod.slug}:externalLinks:${i}:label`} />
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
