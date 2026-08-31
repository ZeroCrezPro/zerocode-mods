import { Link } from 'react-router-dom'
import type { Mod } from '@/data/types'
import { getGameById, latestVersion } from '@/data'
import { statusClass, statusLabel } from '@/lib/labels'
import { formatDate, vLabel } from '@/lib/format'
import { downloadUrl } from '@/lib/download'
import { Badge, btnClass } from './ui'
import { SmartImage } from './SmartImage'
import { IconDownload } from './Icons'

export function ModCard({ mod, eager = false }: { mod: Mod; eager?: boolean }) {
  const game = getGameById(mod.gameId)
  const v = latestVersion(mod)

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
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className="border-blood-600/40 bg-blood-600/10 text-blood-300">
            {game?.name ?? 'Játék'}
          </Badge>
          <Badge className={statusClass[mod.status]}>{statusLabel[mod.status]}</Badge>
        </div>

        <h3 className="text-lg leading-tight font-extrabold tracking-tight text-ash-100">
          <Link
            to={`/modok/${mod.slug}`}
            className="transition-colors group-hover:text-blood-400"
          >
            {mod.name}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-sm text-ash-400">{mod.shortDescription}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink-800 pt-3 text-xs">
          <div>
            <dt className="zc-label text-ash-400">Verzió</dt>
            <dd className="mt-0.5 font-mono font-bold text-ash-100">
              {v ? vLabel(v.version) : '-'}
            </dd>
          </div>
          <div>
            <dt className="zc-label text-ash-400">Frissítve</dt>
            <dd className="mt-0.5 text-ash-200">{v ? formatDate(v.releaseDate) : '-'}</dd>
          </div>
          <div>
            <dt className="zc-label text-ash-400">Platform</dt>
            <dd className="mt-0.5 text-ash-200">PC</dd>
          </div>
          <div>
            <dt className="zc-label text-ash-400">Méret</dt>
            <dd className="mt-0.5 text-ash-200">{v?.size ?? '-'}</dd>
          </div>
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
