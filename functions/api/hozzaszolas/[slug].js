/**
 * Hozzászólások egy modhoz.
 *   GET  /api/hozzaszolas/<slug>            - a legutóbbi üzenetek (nyilvános), legújabb elöl
 *   POST /api/hozzaszolas/<slug> { szoveg } - új üzenet, csak bejelentkezve
 *
 * A KV-ban modonként egy lista (hozzaszolas:<slug>), a legutóbbi 300 üzenet.
 * A szöveg sima szövegként tárolódik és jelenik meg - HTML soha nem fut le.
 */
import mods from '../../../src/data/mods.json' with { type: 'json' }
import { bejelentkezettFiok, jsonValasz, keresTest, nyilvanosFiok, tulSokProba } from '../../_lib/fiok.js'

const HOSSZ = 300
const MAX_KARAKTER = 500

const kulcs = (slug) => `hozzaszolas:${slug}`
const ervenyesSlug = (slug) => /^[a-z0-9-]{1,80}$/.test(slug) && mods.some((m) => m.slug === slug)

async function lista(kv, slug) {
  const l = await kv.get(kulcs(slug), 'json')
  return Array.isArray(l) ? l : []
}

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug ?? '')
  if (!ervenyesSlug(slug)) return jsonValasz({ ok: false, hiba: 'Nincs ilyen mod.' }, 404)
  if (!env.FIOKOK) return jsonValasz({ ok: true, lista: [] })
  return jsonValasz({ ok: true, lista: await lista(env.FIOKOK, slug) })
}

export async function onRequestPost({ request, params, env }) {
  const slug = String(params.slug ?? '')
  if (!ervenyesSlug(slug)) return jsonValasz({ ok: false, hiba: 'Nincs ilyen mod.' }, 404)
  const fiok = await bejelentkezettFiok(request, env)
  if (!fiok) return jsonValasz({ ok: false, hiba: 'Hozzászóláshoz jelentkezz be.' }, 401)
  const test = await keresTest(request)
  if (!test) return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)
  if (await tulSokProba(env.FIOKOK, request, 'hozzaszolas', 30)) {
    return jsonValasz({ ok: false, hiba: 'Túl sok üzenet - várj tíz percet.' }, 429)
  }

  // Csak sima szöveg: vezérlőkarakterek nélkül (a sortörés marad), legfeljebb 500 karakter.
  const szoveg = String(test.szoveg ?? '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
  if (!szoveg) return jsonValasz({ ok: false, hiba: 'Üres üzenetet nem lehet küldeni.' }, 400)
  if ([...szoveg].length > MAX_KARAKTER) return jsonValasz({ ok: false, hiba: `Legfeljebb ${MAX_KARAKTER} karakter.` }, 400)

  const nyilvanos = nyilvanosFiok(fiok)
  const uzenet = { id: crypto.randomUUID(), nev: nyilvanos.nev, kepUrl: nyilvanos.kepUrl, szoveg, ido: Date.now() }
  const l = await lista(env.FIOKOK, slug)
  l.unshift(uzenet)
  await env.FIOKOK.put(kulcs(slug), JSON.stringify(l.slice(0, HOSSZ)))
  return jsonValasz({ ok: true, uzenet })
}
