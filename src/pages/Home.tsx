import { Link } from 'react-router-dom'
import { featuredMods, mods, site, totalDownloads, totalReleases } from '@/data'
import { formatNumber } from '@/lib/format'
import { Felirat, Szoveg } from '@/components/Szoveg'
import { Seo, pageTitle } from '@/components/Seo'
import { ModCard } from '@/components/ModCard'
import { LinkButton, SectionHead } from '@/components/ui'
import { IconArrowRight, IconDownload, IconGamepad, IconPackage } from '@/components/Icons'
import { Empty } from '@/components/Empty'

function Stats() {
  const downloads = totalDownloads()
  const items: { value: string; label: string }[] = [
    { value: String(mods.length), label: 'Mod' },
    { value: String(totalReleases()), label: 'Kiadás' },
    { value: 'PC', label: 'Platform' },
    downloads
      ? { value: `${formatNumber(downloads)}+`, label: 'Letöltés' }
      : { value: '100%', label: 'Ingyenes' },
  ]

  return (
    <dl className="grid grid-cols-2 divide-ink-700 border border-ink-700 bg-ink-900 md:grid-cols-4 md:divide-x">
      {items.map((s, i) => (
        <div
          key={s.label}
          className={
            'px-5 py-6 text-center ' +
            (i < 2 ? 'border-b border-ink-700 md:border-b-0 ' : '') +
            (i % 2 === 0 ? 'border-r border-ink-700 md:border-r-0' : '')
          }
        >
          <dt className="sr-only">{s.label}</dt>
          <dd>
            <span className="block font-mono text-3xl font-black tracking-tight text-ash-100 sm:text-4xl">
              {s.value}
            </span>
            <span className="zc-label mt-1.5 block text-ash-400">{s.label}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink-700">
      <div className="zc-grid-bg absolute inset-0" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(214,31,39,0.22),transparent_58%)]"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blood-600/60 to-transparent"
        aria-hidden
      />

      <div className="zc-container relative py-16 sm:py-24 lg:py-28">
        <p className="zc-label mb-5 flex items-center gap-2.5 text-blood-400">
          <span aria-hidden className="block h-px w-8 bg-blood-500" />
          <Felirat kulcs="fooldal.kicsiCim" alap="PC Modding" /> &middot;{' '}
          <Szoveg ertek={site.author} mezo="site:author" />
        </p>

        <h1 className="max-w-4xl text-4xl leading-[0.95] font-black tracking-tighter uppercase sm:text-6xl lg:text-7xl">
          <Szoveg ertek={site.brandTop} mezo="site:brandTop" />
          <Szoveg
            elem="span"
            className="mt-1 block text-blood-500"
            ertek={site.brandBottom}
            mezo="site:brandBottom"
          />
        </h1>

        <Szoveg
          elem="p"
          className="mt-6 max-w-xl text-base text-ash-300 sm:text-lg"
          ertek={site.tagline}
          mezo="site:tagline"
        />
        <Felirat
          elem="p"
          className="mt-3 max-w-2xl text-sm text-ash-400"
          kulcs="fooldal.bevezeto"
          alap="Saját készítésű modok, trainerek és eszközök - ingyenesen, reklám és linkrövidítő nélkül. A letöltés gomb egy kattintással indítja a fájlt."
        />

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <LinkButton to="/modok" size="lg">
            Modok böngészése
            <IconArrowRight width={16} height={16} />
          </LinkButton>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const featured = featuredMods(6)

  return (
    <>
      <Seo
        title={pageTitle()}
        description={site.description}
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: site.name,
            url: site.url,
            inLanguage: 'hu-HU',
            description: site.description,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${site.url}/modok?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />

      <Hero />

      <div className="zc-container relative z-10 -mt-8 sm:-mt-10">
        <Stats />
      </div>

      <section className="zc-container py-16 sm:py-20">
        <SectionHead
          eyebrow="Válogatás"
          title="Kiemelt modok"
          action={
            <Link
              to="/modok"
              className="zc-label flex items-center gap-2 text-ash-400 transition-colors hover:text-blood-400"
            >
              Összes mod <IconArrowRight width={14} height={14} />
            </Link>
          }
        />
        {featured.length === 0 ? (
          <Empty title="Még nincs közzétett mod.">
            Az első ZeroCode mod hamarosan érkezik. Addig is nézz körbe a Névjegy oldalon.
          </Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((mod, i) => (
              <ModCard key={mod.id} mod={mod} eager={i < 3} />
            ))}
          </div>
        )}
      </section>

      <section className="zc-container pb-16 sm:pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: IconDownload,
              title: 'Egy kattintás',
              text: 'Nincs regisztráció, reklámoldal és linkrövidítő. A gomb közvetlenül a fájlt indítja.',
            },
            {
              icon: IconPackage,
              title: 'Verziókövetés',
              text: 'A régebbi kiadások sem tűnnek el - bármikor visszatölthető egy korábbi verzió.',
            },
            {
              icon: IconGamepad,
              title: 'Dokumentált',
              text: 'Minden modhoz telepítési útmutató, követelmények, kompatibilitás és GYIK tartozik.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="border border-ink-700 bg-ink-900 p-5">
              <Icon width={20} height={20} className="text-blood-500" />
              <Felirat
                elem="h3"
                className="mt-3 text-sm font-bold tracking-wide text-ash-100 uppercase"
                kulcs={`fooldal.elony.${title}.cim`}
                alap={title}
              />
              <Felirat
                elem="p"
                className="mt-2 text-sm text-ash-400"
                kulcs={`fooldal.elony.${title}.szoveg`}
                alap={text}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

