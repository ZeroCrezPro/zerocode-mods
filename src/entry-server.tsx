import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { App } from './App'
import { HeadContext, renderHeadTags, pageTitle } from './components/Seo'
import type { HeadSink } from './components/Seo'
import { mods, site } from './data'

/** Minden előrerenderelendő útvonal. */
export function allRoutes(): string[] {
  return [
    '/',
    '/modok',
    '/legujabb',
    '/nevjegy',
    '/kapcsolat',
    '/jogi-informaciok',
    '/adatvedelem',
    ...mods.map((m) => `/modok/${m.slug}`),
  ]
}

export function render(url: string): { html: string; head: string } {
  const sink: HeadSink = {}
  const html = renderToString(
    <HeadContext.Provider value={sink}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HeadContext.Provider>,
  )

  const head = renderHeadTags(
    sink.data ?? {
      title: pageTitle(),
      description: site.description,
      path: url,
    },
  )

  return { html, head }
}

/** sitemap.xml tartalma. */
export function renderSitemap(): string {
  const base = site.url.replace(/\/$/, '')
  const entries = allRoutes()
    .map((r) => {
      const priority = r === '/' ? '1.0' : r.startsWith('/modok/') ? '0.9' : '0.7'
      return `  <url>\n    <loc>${base}${r === '/' ? '/' : r}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

/** robots.txt tartalma. */
export function renderRobots(): string {
  const base = site.url.replace(/\/$/, '')
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`
}
