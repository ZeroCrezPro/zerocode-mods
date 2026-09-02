import type { Mod, ModVersion } from '@/data/types'
import { formatDate, formatNumber, vLabel } from '@/lib/format'
import { downloadFileName, downloadUrl } from '@/lib/download'
import { Badge, btnClass } from './ui'
import { IconDownload } from './Icons'
import { Felirat, Szoveg } from './Szoveg'
import { csakSzoveg } from '@/lib/gazdagSzoveg'

function Meta({ label, kulcs, value }: { label: string; kulcs: string; value: string }) {
  return (
    <div>
      <Felirat elem="dt" className="zc-label text-ash-400" kulcs={kulcs} alap={label} />
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
  // A verzió helye a listában - ebből lesz a szerkesztő jelölője.
  const vi = mod.versions.indexOf(version)

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
            <Badge className="border-blood-500 bg-blood-600 text-white">
              <Felirat kulcs="verzio.legujabb" alap="Legújabb" />
            </Badge>
          )}
          {version.prerelease && (
            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300">
              <Felirat kulcs="verzio.elozetes" alap="Előzetes" />
            </Badge>
          )}
          <span className="ml-auto text-xs text-ash-400">{formatDate(version.releaseDate)}</span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-ink-800 py-3.5 sm:grid-cols-4">
          <Meta label="Méret" kulcs="mod.meret" value={version.size ?? 'ismeretlen'} />
          <Meta
            label="Platform"
            kulcs="mod.platform"
            value={csakSzoveg(version.platform ?? mod.platform)}
          />
          <Meta label="Típus" kulcs="verzio.tipus" value={version.type ?? 'ZIP'} />
          <Meta
            label="Letöltések"
            kulcs="verzio.letoltesek"
            value={
              typeof version.downloads === 'number' ? formatNumber(version.downloads) : 'nincs adat'
            }
          />
        </dl>

        {version.changes && version.changes.length > 0 && (
          <div className="mt-4">
            <Felirat
              elem="p"
              className="zc-label mb-2 text-ash-400"
              kulcs="verzio.valtozasok"
              alap="Változások"
            />
            <ul className="space-y-1.5">
              {version.changes.map((c, ci) => (
                <li key={c} className="flex gap-2.5 text-sm text-ash-300">
                  <span aria-hidden className="mt-2 block h-1 w-1 shrink-0 bg-blood-500" />
                  <Szoveg ertek={c} mezo={`${mod.slug}:versions:${vi}:changes:${ci}`} />
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
            aria-label={`${csakSzoveg(mod.name)} ${vLabel(version.version)} letöltése${
              file ? ` (${file})` : ''
            }`}
          >
            <IconDownload width={16} height={16} />
            <Felirat kulcs="gomb.letoltes" alap="Letöltés" />
          </a>
          <p className="text-xs text-ash-400 sm:ml-auto">
            <Felirat kulcs="verzio.keszito" alap="Készítő:" />{' '}
            <Szoveg
              className="text-ash-200"
              ertek={version.author ?? mod.author}
              mezo={
                version.author
                  ? `${mod.slug}:versions:${vi}:author`
                  : `${mod.slug}:author`
              }
            />
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
