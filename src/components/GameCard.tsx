import { Link } from 'react-router-dom'
import type { Game } from '@/data/types'
import { gameLastUpdated, modCountForGame } from '@/data'
import { formatDate } from '@/lib/format'
import { btnClass } from './ui'
import { SmartImage } from './SmartImage'

export function GameCard({ game, eager = false }: { game: Game; eager?: boolean }) {
  const count = modCountForGame(game)
  const updated = gameLastUpdated(game)

  return (
    <article className="group flex h-full flex-col border border-ink-700 bg-ink-900 transition-colors duration-200 hover:border-blood-600/70">
      <Link
        to={`/jatekok/${game.slug}`}
        tabIndex={-1}
        aria-hidden
        className="block overflow-hidden border-b border-ink-700"
      >
        <SmartImage
          src={game.cover}
          alt=""
          eager={eager}
          ratio="aspect-[3/2]"
          fallbackText={game.name}
          imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg leading-tight font-extrabold tracking-tight text-ash-100">
          <Link to={`/jatekok/${game.slug}`} className="transition-colors group-hover:text-blood-400">
            {game.name}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-ash-400">
          {game.fullName} &middot; {game.releaseYear}
        </p>

        <p className="mt-2 line-clamp-2 text-sm text-ash-400">{game.shortDescription}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 border-t border-ink-800 pt-3 text-xs">
          <div>
            <dt className="zc-label text-ash-400">Modok</dt>
            <dd className="mt-0.5 font-mono font-bold text-ash-100">{count} db</dd>
          </div>
          <div>
            <dt className="zc-label text-ash-400">Frissítve</dt>
            <dd className="mt-0.5 text-ash-200">{updated ? formatDate(updated) : '-'}</dd>
          </div>
        </dl>

        <Link to={`/jatekok/${game.slug}`} className={btnClass('secondary', 'sm', 'mt-4 w-full')}>
          Megnyitás
        </Link>
      </div>
    </article>
  )
}
