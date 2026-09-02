import type { Mod, ModVersion } from '@/data/types'
import { formatDate, formatNumber, vLabel } from '@/lib/format'
import { downloadFileName, downloadUrl } from '@/lib/download'
import { Badge, btnClass } from './ui'
import { IconDownload } from './Icons'

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="zc-label text-ash-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-ash-200">{value}</dd>
    </div>
  )
}

export function VersionCard({
  mod,
  version,
  latest = false,
}: {
  mod: Mod
  version: ModVersion
  latest?: boolean
}) {
  const url = downloadUrl(version.download)
  const file = downloadFileName(version.download)

  return (
    <article
      className={
        latest
          ? 'border border-blood-600/50 bg-ink-900'
          : 'border border-ink-700 bg-ink-900/60'
      }
    >
      {latest && (
        <div className="zc-diag h-1 w-full bg-blood-600/20" aria-hidden />
      )}
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-xl font-black tracking-tight text-ash-100">
            {vLabel(version.version)}
          </span>
          {latest && (
            <Badge className="border-blood-500 bg-blood-600 text-white">Legújabb</Badge>
          )}
          {version.prerelease && (
            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300">Előzetes</Badge>
          )}
          <span className="ml-auto text-xs text-ash-400">{formatDate(version.releaseDate)}</span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-ink-800 py-3.5 sm:grid-cols-4">
          <Meta label="Méret" value={version.size ?? 'ismeretlen'} />
          <Meta label="Platform" value={version.platform ?? mod.platform} />
          <Meta label="Típus" value={version.type ?? 'ZIP'} />
          <Meta
            label="Letöltések"
            value={
              typeof version.downloads === 'number' ? formatNumber(version.downloads) : 'nincs adat'
            }
          />
        </dl>

        {version.changes && version.changes.length > 0 && (
          <div className="mt-4">
            <p className="zc-label mb-2 text-ash-400">Változások</p>
            <ul className="space-y-1.5">
              {version.changes.map((c) => (
                <li key={c} className="flex gap-2.5 text-sm text-ash-300">
                  <span aria-hidden className="mt-2 block h-1 w-1 shrink-0 bg-blood-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <a
            href={url}
            rel="noopener noreferrer"
            className={btnClass(latest ? 'primary' : 'secondary', latest ? 'lg' : 'md', 'sm:flex-none')}
            aria-label={`${mod.name} ${vLabel(version.version)} letöltése${file ? ` (${file})` : ''}`}
          >
            <IconDownload width={16} height={16} />
            Letöltés
          </a>
          <p className="text-xs text-ash-400 sm:ml-auto">
            Készítő: <span className="text-ash-200">{version.author ?? mod.author}</span>
            {file && (
              <>
                {' '}
                &middot; <span className="font-mono">{file}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </article>
  )
}
