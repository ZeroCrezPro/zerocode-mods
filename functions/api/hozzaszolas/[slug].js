/**
 * Hozzászólások egy modhoz.
 *   GET    /api/hozzaszolas/<slug>            - a legutóbbi üzenetek (nyilvános), legújabb elöl
 *   POST   /api/hozzaszolas/<slug> { szoveg } - új üzenet, csak bejelentkezve
 *   DELETE /api/hozzaszolas/<slug> { id }     - a saját üzenet törlése
 *   PUT    /api/hozzaszolas/<slug> { id, szavazat: 'jo' | 'rossz' | null } - pipa / X az üzenetre
 *
 * A KV-ban modonként egy lista (hozzaszolas:<slug>), a legutóbbi 300 üzenet.
 * A szöveg sima szövegként tárolódik és jelenik meg - HTML soha nem fut le.
 */
import mods from '../../../src/data/mods.json' with { type: 'json' }
import { bejelentkezettFiok, emailKulcs, jsonValasz, keresTest, nyilvanosFiok, tulSokProba } from '../../_lib/fiok.js'

const HOSSZ = 300
const MAX_KARAKTER = 500

const kulcs = (slug) => `hozzaszolas:${slug}`
const ervenyesSlug = (slug) => /^[a-z0-9-]{1,80}$/.test(slug) && mods.some((m) => m.slug === slug)

async function lista(kv, slug) {
  const l = await kv.get(kulcs(slug), 'json')
  return Array.isArray(l) ? l : []
}

/**
 * Kifelé a tulajdonos és a szavazók e-mailje nem megy; helyette: a kérőé-e az
 * üzenet, hány pipa / X van rajta, és a kérő mit szavazott.
 */
const nyilvanos = (l, sajatEmail) =>
  l.map(({ tulaj, jo = [], rossz = [], ...u }) => ({
    ...u,
    sajat: Boolean(sajatEmail) && tulaj === sajatEmail,
    jo: jo.length,
    rossz: rossz.length,
    sajatSzavazat: sajatEmail && jo.includes(sajatEmail) ? 'jo' : sajatEmail && rossz.includes(sajatEmail) ? 'rossz' : null,
  }))

export async function onRequestPut({ request, params, env }) {
  const slug = String(params.slug ?? '')
  if (!ervenyesSlug(slug)) return jsonValasz({ ok: false, hiba: 'Nincs ilyen mod.' }, 404)
  const fiok = await bejelentkezettFiok(request, env)
  if (!fiok) return jsonValasz({ ok: false, hiba: 'Szavazáshoz jelentkezz be.' }, 401)
  const test = await keresTest(request)
  const id = String(test?.id ?? '')
  const szavazat = test?.szavazat === 'jo' || test?.szavazat === 'rossz' ? test.szavazat : null
  const l = await lista(env.FIOKOK, slug)
  const u = l.find((x) => x.id === id)
  if (!u) return jsonValasz({ ok: false, hiba: 'Ez az üzenet már nincs meg.' }, 404)
  const en = emailKulcs(fiok.email)
  u.jo = (u.jo ?? []).filter((e) => e !== en)
  u.rossz = (u.rossz ?? []).filter((e) => e !== en)
  if (szavazat === 'jo') u.jo.push(en)
  if (szavazat === 'rossz') u.rossz.push(en)
  await env.FIOKOK.put(kulcs(slug), JSON.stringify(l))
  return jsonValasz({ ok: true, lista: nyilvanos(l, en) })
}

export async function onRequestGet({ request, params, env }) {
  const slug = String(params.slug ?? '')
  if (!ervenyesSlug(slug)) return jsonValasz({ ok: false, hiba: 'Nincs ilyen mod.' }, 404)
  if (!env.FIOKOK) return jsonValasz({ ok: true, lista: [] })
  const fiok = await bejelentkezettFiok(request, env)
  return jsonValasz({ ok: true, lista: nyilvanos(await lista(env.FIOKOK, slug), fiok ? emailKulcs(fiok.email) : '') })
}

export async function onRequestDelete({ request, params, env }) {
  const slug = String(params.slug ?? '')
  if (!ervenyesSlug(slug)) return jsonValasz({ ok: false, hiba: 'Nincs ilyen mod.' }, 404)
  const fiok = await bejelentkezettFiok(request, env)
  if (!fiok) return jsonValasz({ ok: false, hiba: 'Nem vagy bejelentkezve.' }, 401)
  const test = await keresTest(request)
  const id = String(test?.id ?? '')
  const l = await lista(env.FIOKOK, slug)
  const en = emailKulcs(fiok.email)
  const u = l.find((x) => x.id === id)
  if (!u) return jsonValasz({ ok: false, hiba: 'Ez az üzenet már nincs meg.' }, 404)
  if (u.tulaj !== en) return jsonValasz({ ok: false, hiba: 'Csak a saját üzenetedet törölheted.' }, 403)
  const uj = l.filter((x) => x.id !== id)
  await env.FIOKOK.put(kulcs(slug), JSON.stringify(uj))
  return jsonValasz({ ok: true, lista: nyilvanos(uj, en) })
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

  const adat = nyilvanosFiok(fiok)
  const uzenet = { id: crypto.randomUUID(), nev: adat.nev, kepUrl: adat.kepUrl, szoveg, ido: Date.now(), tulaj: emailKulcs(fiok.email) }
  const l = await lista(env.FIOKOK, slug)
  l.unshift(uzenet)
  await env.FIOKOK.put(kulcs(slug), JSON.stringify(l.slice(0, HOSSZ)))
  const { tulaj, ...ki } = uzenet
  void tulaj
  return jsonValasz({ ok: true, uzenet: { ...ki, sajat: true } })
}
