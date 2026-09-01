import { createContext, useContext, useEffect } from 'react'
import { site } from '@/data/site'

export interface SeoData {
  title: string
  description: string
  /** Az oldal útvonala, pl. "/modok/valami". A canonical ebből épül. */
  path: string
  image?: string
  type?: 'website' | 'article'
  /** Strukturált adat (JSON-LD) objektumok */
  jsonLd?: Record<string, unknown>[]
  noIndex?: boolean
}

/** Szerveroldali gyűjtő: a prerender ebből olvassa ki a <head> tartalmát. */
export interface HeadSink {
  data?: SeoData
}

export const HeadContext = createContext<HeadSink | null>(null)

function abs(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  return site.url.replace(/\/$/, '') + pathOrUrl
}

/** A megadott SEO adatokból <head> HTML-t épít (prerenderhez). */
export function renderHeadTags(data: SeoData): string {
  const title = data.title
  const url = abs(data.path)
  const image = abs(data.image ?? site.ogImage)
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const tags = [
    `<link rel="icon" href="${esc(site.favicon || '/favicon.svg')}" />`,
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(data.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    data.noIndex
      ? '<meta name="robots" content="noindex,follow" />'
      : '<meta name="robots" content="index,follow" />',
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:locale" content="hu_HU" />`,
    `<meta property="og:type" content="${data.type ?? 'website'}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(data.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(data.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ]

  for (const ld of data.jsonLd ?? []) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\u003c')}</script>`,
    )
  }
  return tags.join('\n    ')
}

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Oldalankénti SEO. Szerveren a HeadContext gyűjtőbe ír (prerender),
 * böngészőben közvetlenül a document.head-et frissíti.
 */
export function Seo(data: SeoData) {
  const sink = useContext(HeadContext)
  if (sink) sink.data = data

  useEffect(() => {
    document.title = data.title
    const url = abs(data.path)
    const image = abs(data.image ?? site.ogImage)

    setMeta('meta[name="description"]', 'name', 'description', data.description)
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      data.noIndex ? 'noindex,follow' : 'index,follow',
    )
    setMeta('meta[property="og:title"]', 'property', 'og:title', data.title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', data.description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', url)
    setMeta('meta[property="og:image"]', 'property', 'og:image', image)
    setMeta('meta[property="og:type"]', 'property', 'og:type', data.type ?? 'website')
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', data.title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', data.description)
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image)

    // Böngészőfül ikonja (a beállításokból, vagy a beépített alapértelmezett)
    let ikon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!ikon) {
      ikon = document.createElement('link')
      ikon.rel = 'icon'
      document.head.appendChild(ikon)
    }
    ikon.href = site.favicon || '/favicon.svg'

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = url

    // JSON-LD: az előző futás blokkjait cseréljük
    document.head.querySelectorAll('script[data-zc-ld]').forEach((n) => n.remove())
    for (const ld of data.jsonLd ?? []) {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.dataset.zcLd = 'true'
      s.textContent = JSON.stringify(ld)
      document.head.appendChild(s)
    }
  }, [data])

  return null
}

/** Egységes oldalcím: "Valami | ZeroCode Mods" */
export function pageTitle(part?: string): string {
  return part ? `${part} | ${site.name}` : `${site.name} - ${site.tagline}`
}
