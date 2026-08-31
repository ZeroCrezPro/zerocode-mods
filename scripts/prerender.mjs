/**
 * Statikus előrenderelés.
 *
 * A Vite kétszer buildel: egyszer a böngészőnek (dist/), egyszer a
 * Node-nak (dist-ssr/). Ez a szkript minden útvonalra legyárt egy kész
 * HTML fájlt, hogy a keresők és a közösségi oldalak valódi tartalmat
 * és helyes meta adatokat lássanak. A böngészőben ugyanez hidratálódik,
 * onnantól SPA-ként működik.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')
const ssrEntry = path.join(root, 'dist-ssr', 'entry-server.js')

const { render, allRoutes, renderSitemap, renderRobots } = await import(
  pathToFileURL(ssrEntry).href
)

const template = await fs.readFile(path.join(distDir, 'index.html'), 'utf8')

if (!template.includes('<!--app-html-->') || !template.includes('<!--app-head-->')) {
  throw new Error('Az index.html-ből hiányzik az <!--app-html--> vagy az <!--app-head--> jelölő.')
}

const routes = allRoutes()
let written = 0

for (const route of routes) {
  const { html, head } = render(route)
  const page = template.replace('<!--app-head-->', head).replace('<!--app-html-->', html)

  // Lapos fájlnév (pl. dist/modok.html), NEM dist/modok/index.html:
  // így a Cloudflare Pages a /modok címet perjel nélkül szolgálja ki, és nem
  // irányít át /modok/ alakra - a canonical URL-ek így pontosan egyeznek.
  const outFile =
    route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, `${route}.html`)

  await fs.mkdir(path.dirname(outFile), { recursive: true })
  await fs.writeFile(outFile, page, 'utf8')
  written++
}

// A 404-es oldal külön fájlként is kell: a Cloudflare Pages ezt szolgálja ki,
// ha egy útvonalhoz nem tartozik statikus fájl.
const notFound = render('/nincs-ilyen-oldal')
await fs.writeFile(
  path.join(distDir, '404.html'),
  template.replace('<!--app-head-->', notFound.head).replace('<!--app-html-->', notFound.html),
  'utf8',
)

await fs.writeFile(path.join(distDir, 'sitemap.xml'), renderSitemap(), 'utf8')
await fs.writeFile(path.join(distDir, 'robots.txt'), renderRobots(), 'utf8')

console.log(`Előrenderelve: ${written} oldal + 404.html, sitemap.xml, robots.txt`)
