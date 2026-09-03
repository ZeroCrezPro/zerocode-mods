import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Mod } from '@/data/types'
import { latestVersion } from '@/data'
import { statusLabel, statusTextClass } from '@/lib/labels'
import { formatDate, vLabel } from '@/lib/format'
import { SmartImage } from './SmartImage'
import { Felirat, Szoveg } from './Szoveg'
import { csakSzoveg } from '@/lib/gazdagSzoveg'

function Adat({
  cim,
  kulcs,
  children,
}: {
  cim: string
  kulcs: string
  children: ReactNode
}) {
  return (
    <div>
      <Felirat elem="dt" className="zc-label text-ash-400" kulcs={kulcs} alap={cim} />
      <dd className="mt-0.5 text-ash-200">{children}</dd>
    </div>
  )
}

export function ModCard({ mod, eager = false }: { mod: Mod; eager?: boolean }) {
  const v = latestVersion(mod)

  const nev = csakSzoveg(mod.name)

  // Ha a mod ugyanazt a nevet kapta, mint a játék, ne írjuk ki kétszer.
  const jatekNeve = mod.game && csakSzoveg(mod.game) !== nev ? mod.game : null

  return (
    <article className="group flex h-full flex-col border border-ink-700 bg-ink-900 transition-colors duration-200 hover:border-blood-600/70">
      <Link
        to={`/modok/${mod.slug}`}
        tabIndex={-1}
        aria-hidden
        className="block overflow-hidden border-b border-ink-700"
      >
        <SmartImage
          src={mod.cover}
          alt=""
          eager={eager}
          fallbackText={nev}
          imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg leading-tight font-extrabold tracking-tight text-ash-100">
          <Link to={`/modok/${mod.slug}`} className="transition-colors group-hover:text-blood-400">
            <Szoveg ertek={mod.name} mezo={`${mod.slug}:name`} />
          </Link>
        </h3>

        <Szoveg
          elem="p"
          className="mt-2 line-clamp-3 text-sm text-ash-400"
          ertek={mod.shortDescription}
          mezo={`${mod.slug}:shortDescription`}
        />

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-ink-800 pt-3 text-xs">
          {jatekNeve && (
            <Adat cim="Játék" kulcs="kartya.jatek">
              <Szoveg ertek={jatekNeve} mezo={`${mod.slug}:game`} />
            </Adat>
          )}
          <Adat cim="Állapot" kulcs="mod.allapot">
            <span className={statusTextClass[mod.status]}>
              <Felirat kulcs={`mod.allapot.${mod.status}`} alap={statusLabel[mod.status]} />
            </span>
          </Adat>
          <Adat cim="Verzió" kulcs="kartya.verzio">
            <span className="font-mono font-bold text-ash-100">{v ? vLabel(v.version) : '-'}</span>
          </Adat>
          <Adat cim="Frissítve" kulcs="mod.frissitve">
            {v ? formatDate(v.releaseDate) : '-'}
          </Adat>
          <Adat cim="Platform" kulcs="mod.platform">
            {csakSzoveg(mod.platform).replace(/^Windows /, '') || 'PC'}
          </Adat>
          <Adat cim="Méret" kulcs="mod.meret">
            {v?.size ?? '-'}
          </Adat>
        </dl>

        {/*
          A kártyán nincs Letöltés gomb: a letöltés az adatlapon van, ahol a
          telepítési kódot is fel kell fedni hozzá - innen letölteni
          megkerülné. A kártya a nevére vagy a képére kattintva nyílik.
        */}
      </div>
    </article>
  )
}
