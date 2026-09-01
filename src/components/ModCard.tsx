import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Mod } from '@/data/types'
import { getGameById, latestVersion } from '@/data'
import { statusLabel, statusTextClass } from '@/lib/labels'
import { formatDate, vLabel } from '@/lib/format'
import { downloadUrl } from '@/lib/download'
import { btnClass } from './ui'
import { SmartImage } from './SmartImage'
import { IconDownload } from './Icons'

function Adat({ cim, children }: { cim: string; children: ReactNode }) {
  return (
    <div>
      <dt className="zc-label text-ash-400">{cim}</dt>
      <dd className="mt-0.5 text-ash-200">{children}</dd>
    </div>
  )
}

export function ModCard({ mod, eager = false }: { mod: Mod; eager?: boolean }) {
  const game = getGameById(mod.gameId)
  const v = latestVersion(mod)

  // Ha a mod ugyanazt a nevet kapta, mint a játék, ne írjuk ki kétszer.
  const jatekNeve = game && game.name !== mod.name ? game.name : null

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
          fallbackText={mod.name}
          imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg leading-tight font-extrabold tracking-tight text-ash-100">
          <Link to={`/modok/${mod.slug}`} className="transition-colors group-hover:text-blood-400">
            {mod.name}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-sm text-ash-400">{mod.shortDescription}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-ink-800 pt-3 text-xs">
          {jatekNeve && <Adat cim="Játék">{jatekNeve}</Adat>}
          <Adat cim="Állapot">
            <span className={statusTextClass[mod.status]}>{statusLabel[mod.status]}</span>
          </Adat>
          <Adat cim="Verzió">
            <span className="font-mono font-bold text-ash-100">{v ? vLabel(v.version) : '-'}</span>
          </Adat>
          <Adat cim="Frissítve">{v ? formatDate(v.releaseDate) : '-'}</Adat>
          <Adat cim="Platform">{mod.platform.replace(/^Windows /, '') || 'PC'}</Adat>
          <Adat cim="Méret">{v?.size ?? '-'}</Adat>
        </dl>

        <div className="mt-4 flex gap-2 pt-1">
          <Link
            to={`/modok/${mod.slug}`}
            className={btnClass('secondary', 'sm', 'flex-1')}
            aria-label={`${mod.name} részletei`}
          >
            Részletek
          </Link>
          {v && (
            <a
              href={downloadUrl(v.download)}
              rel="noopener noreferrer"
              className={btnClass('primary', 'sm', 'flex-1')}
              aria-label={`${mod.name} ${vLabel(v.version)} letöltése`}
            >
              <IconDownload width={14} height={14} />
              Letöltés
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
