import { Link } from 'react-router-dom'
import { site } from '@/data/site'
import { IconGithub } from './Icons'

const columns: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
  {
    title: 'Tartalom',
    links: [
      { label: 'Modok', to: '/modok' },
    ],
  },
  {
    title: 'ZeroCode',
    links: [
      { label: 'Névjegy', to: '/nevjegy' },
      { label: 'Kapcsolat', to: '/kapcsolat' },
      { label: 'GitHub', href: `https://github.com/${site.githubUser}` },
    ],
  },
  {
    title: 'Jogi',
    links: [
      { label: 'Jogi információk', to: '/jogi-informaciok' },
      { label: 'Adatvédelem', to: '/adatvedelem' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-700 bg-ink-900">
      <div className="zc-container grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          {site.logo && (
            <img src={site.logo} alt="" aria-hidden className="mb-3 h-12 w-12 object-contain" />
          )}
          <p className="text-[15px] font-black tracking-[0.18em] text-ash-100">{site.brandTop}</p>
          <p className="mt-1 text-[10px] font-bold tracking-[0.42em] text-blood-400">
            {site.brandBottom}
          </p>
          <p className="mt-4 max-w-sm text-sm text-ash-400">{site.tagline}</p>
          <a
            href={`https://github.com/${site.githubUser}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 border border-ink-600 px-3 py-2 text-xs font-bold tracking-widest text-ash-300 uppercase transition-colors hover:border-blood-600 hover:text-ash-100"
          >
            <IconGithub width={16} height={16} /> GitHub
          </a>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="zc-label mb-4 text-ash-100">{col.title}</h2>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link
                      to={l.to}
                      className="text-sm text-ash-400 transition-colors hover:text-blood-400"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-ash-400 transition-colors hover:text-blood-400"
                    >
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-ink-800">
        <div className="zc-container flex flex-col gap-4 py-6 text-xs text-ash-400 md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {site.name} &middot; Készítette:{' '}
            <span className="text-ash-200">{site.author}</span>
          </p>
          <p className="max-w-2xl leading-relaxed md:text-right">
            A játékok nevei, logói és egyéb védjegyei a megfelelő tulajdonosaik tulajdonát képezik. A{' '}
            {site.name} nem áll kapcsolatban a játékok eredeti kiadóival vagy fejlesztőivel, kivéve
            ha ez külön fel van tüntetve.
          </p>
        </div>
      </div>
    </footer>
  )
}
