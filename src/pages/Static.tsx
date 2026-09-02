import type { ReactNode } from 'react'
import { mods, site, totalReleases } from '@/data'
import { Seo, pageTitle } from '@/components/Seo'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Panel } from '@/components/ui'


/** Közös keret a szöveges oldalakhoz. */
function Page({
  title,
  eyebrow,
  lead,
  crumb,
  children,
}: {
  title: string
  eyebrow: string
  lead?: string
  crumb: string
  children: ReactNode
}) {
  return (
    <div className="zc-container py-10 sm:py-14">
      <Breadcrumbs items={[{ label: 'Főoldal', to: '/' }, { label: crumb }]} />
      <header className="mb-8">
        <p className="zc-label mb-2 text-blood-400">{eyebrow}</p>
        <h1 className="text-3xl font-black tracking-tight uppercase sm:text-4xl">{title}</h1>
        {lead && <p className="mt-3 max-w-2xl text-sm text-ash-400">{lead}</p>}
      </header>
      <div className="grid max-w-4xl gap-6">{children}</div>
    </div>
  )
}

const proseText = 'text-sm leading-relaxed text-ash-300'

export function About() {
  return (
    <Page
      eyebrow="Rólam"
      title="Névjegy"
      crumb="Névjegy"
      lead={`A ${site.name} egyetlen ember projektje: itt gyűjtöm össze a saját készítésű játékmodjaimat és eszközeimet.`}
    >
      <Seo
        title={pageTitle('Névjegy')}
        description={`Mi az a ${site.name}? Egy központi oldal ${site.author} játékmodjainak és eszközeinek - ingyenesen, reklám nélkül.`}
        path="/nevjegy"
      />

      <Panel title="Mi ez az oldal?">
        <div className="space-y-4">
          <p className={proseText}>
            A {site.name} egy központi katalógus a {site.author} által készített játékmodokhoz,
            trainerekhez és segédeszközökhöz. Minden mod saját adatlapot kap: leírást, funkciólistát,
            képeket, telepítési útmutatót, követelményeket, kompatibilitási táblázatot és teljes
            verziótörténetet.
          </p>
          <p className={proseText}>
            Jelenleg {mods.length} mod érhető el, összesen {totalReleases()} kiadással. A lista
            folyamatosan bővül.
          </p>
        </div>
      </Panel>

      <Panel title="Hogyan működnek a letöltések?">
        <p className={proseText}>
          Nincs regisztráció, nincs reklámoldal, nincs linkrövidítő és nincs várakozási idő - a
          letöltés gombra kattintva azonnal az igazi fájl indul el.
        </p>
      </Panel>

      <Panel title="Alapelvek">
        <ul className="space-y-3">
          {[
            'Ingyenes - minden mod ingyen letölthető, fizetős tartalom nincs.',
            'Átlátható - minden kiadáshoz tartozik változási napló és megőrzött régebbi verzió.',
            'Visszafordítható - a modok eltávolíthatók, a telepítők biztonsági másolatot készítenek.',
            'Tiszta - nincs telemetria, nincs reklám, nincs kötelező fiók.',
          ].map((t) => (
            <li key={t} className="flex gap-3 text-sm text-ash-300">
              <span aria-hidden className="mt-2 block h-1.5 w-1.5 shrink-0 bg-blood-500" />
              {t}
            </li>
          ))}
        </ul>
      </Panel>
    </Page>
  )
}

export function Contact() {
  return (
    <Page
      eyebrow="Elérhetőség"
      title="Kapcsolat"
      crumb="Kapcsolat"
      lead="Hibát találtál, vagy van egy ötleted? Így tudsz elérni."
    >
      <Seo
        title={pageTitle('Kapcsolat')}
        description={`Kapcsolatfelvétel a ${site.name} készítőjével - hibabejelentés, javaslatok, együttműködés.`}
        path="/kapcsolat"
      />

      <Panel title="Hibabejelentés">
        <p className={proseText}>
          Ha hibát találsz, írd le, melyik modról és melyik verzióról van szó, milyen
          játékkiadást használsz (Steam / GOG / retail), és mi történik pontosan. Így sokkal
          gyorsabban megtalálom a hiba okát.
        </p>
      </Panel>

      <Panel title="E-mail">
        <p className={proseText}>
          Írhatsz e-mailt. A válasz néha eltarthat pár napig.
        </p>
        <p className="mt-3">
          <a
            href={`mailto:${site.email}`}
            className="font-mono text-sm text-blood-400 underline decoration-blood-600/50 underline-offset-4 transition-colors hover:text-blood-300"
          >
            {site.email}
          </a>
        </p>
      </Panel>
    </Page>
  )
}

export function Legal() {
  return (
    <Page
      eyebrow="Jogi"
      title="Jogi információk"
      crumb="Jogi információk"
      lead="Védjegyek, felelősség és felhasználási feltételek."
    >
      <Seo
        title={pageTitle('Jogi információk')}
        description={`Jogi információk és felelősségkizárás a ${site.name} oldalhoz.`}
        path="/jogi-informaciok"
      />

      <Panel title="Védjegyek">
        <p className={proseText}>
          A játékok nevei, logói, borítói és egyéb védjegyei a megfelelő tulajdonosaik tulajdonát
          képezik. A {site.name} nem áll kapcsolatban a játékok eredeti kiadóival vagy
          fejlesztőivel, kivéve ha ez külön fel van tüntetve.
        </p>
      </Panel>

      <Panel title="Felelősség">
        <div className="space-y-4">
          <p className={proseText}>
            A modok használata saját felelősségre történik. A modok módosítják a játékfájlokat,
            ezért telepítés előtt mindig érdemes biztonsági másolatot készíteni.
          </p>
          <p className={proseText}>
            A {site.name} nem vállal felelősséget a modok használatából eredő adatvesztésért,
            hibás működésért, illetve semmilyen egyéb kárért. A modok jótállás nélkül, &bdquo;ahogy
            vannak&rdquo; állapotban érhetők el.
          </p>
          <p className={proseText}>
            A modok kizárólag jogtiszta, megvásárolt játékpéldányokkal való használatra készültek.
          </p>
        </div>
      </Panel>

      <Panel title="Felhasználás és terjesztés">
        <div className="space-y-4">
          <p className={proseText}>
            A modok szabadon letölthetők és használhatók személyes célra. Kérlek, ne tükrözd a
            fájlokat más letöltőoldalakra, hanem erre az oldalra hivatkozz - így mindenki mindig
            a legfrissebb és sértetlen verziót kapja.
          </p>
          <p className={proseText}>
            Ha egy modot beépítenél a saját munkádba, előtte írj a kapcsolati oldalon megadott
            elérhetőségen.
          </p>
        </div>
      </Panel>
    </Page>
  )
}

export function Privacy() {
  return (
    <Page
      eyebrow="Adatvédelem"
      title="Adatvédelem"
      crumb="Adatvédelem"
      lead="Milyen adatokat kezel ez az oldal? A rövid válasz: alig valamit."
    >
      <Seo
        title={pageTitle('Adatvédelem')}
        description={`Adatvédelmi tájékoztató a ${site.name} oldalhoz - nincs süti, nincs követés, nincs regisztráció.`}
        path="/adatvedelem"
      />

      <Panel title="Sütik és követés">
        <div className="space-y-4">
          <p className={proseText}>
            Ez az oldal nem használ sütiket, nem futtat hirdetési vagy analitikai szkripteket, és
            nem hoz létre felhasználói profilt. Nincs regisztráció, így személyes adatot sem kér.
          </p>
          <p className={proseText}>
            Az oldal beállításai (például a keresés) kizárólag a böngésződben, az adott munkamenet
            idejére léteznek.
          </p>
        </div>
      </Panel>

      <Panel title="Tárhelyszolgáltató és külső szolgáltatások">
        <div className="space-y-4">
          <p className={proseText}>
            Az oldalt a Cloudflare Pages szolgálja ki. A Cloudflare technikai naplókat vezethet
            (például IP-cím, böngészőazonosító) a szolgáltatás működtetése és a visszaélések
            kiszűrése céljából.
          </p>
          <p className={proseText}>
            A letöltés gombra kattintva a fájlt kiszolgáló szolgáltatóhoz kerülsz át, ahol az ő
            saját adatkezelési szabályzata érvényes.
          </p>
        </div>
      </Panel>

      <Panel title="Kapcsolat adatvédelmi ügyben">
        <p className={proseText}>
          Adatvédelemmel kapcsolatos kérdésekben a{' '}
          <a
            href={`mailto:${site.email}`}
            className="text-blood-400 underline decoration-blood-600/50 underline-offset-4"
          >
            {site.email}
          </a>{' '}
          címen érhetsz el.
        </p>
      </Panel>
    </Page>
  )
}
