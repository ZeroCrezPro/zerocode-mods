/**
 * POST /api/megtekintes/<slug> -> a mod megtekintés-számlálója eggyel nő.
 * Ugyanarról a címről ugyanarra a modra fél percen belül csak egyszer számít,
 * hogy az újratöltögetés ne pörgesse.
 */
import mods from '../../../src/data/mods.json' with { type: 'json' }
import { jsonValasz } from '../../_lib/fiok.js'

export async function onRequestPost({ request, params, env }) {
  const slug = String(params.slug ?? '')
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || !mods.some((m) => m.slug === slug)) {
    return jsonValasz({ ok: false, hiba: 'Nincs ilyen mod.' }, 404)
  }
  if (!env.FIOKOK) return jsonValasz({ ok: true, szam: 0 })
  const ip = request.headers.get('CF-Connecting-IP') ?? 'ismeretlen'
  const zar = `megtekintes-zar:${slug}:${ip}`
  const kulcs = `megtekintes:${slug}`
  if (await env.FIOKOK.get(zar)) {
    return jsonValasz({ ok: true, szam: Number((await env.FIOKOK.get(kulcs)) ?? 0) || 0 })
  }
  await env.FIOKOK.put(zar, '1', { expirationTtl: 60 })
  const szam = (Number((await env.FIOKOK.get(kulcs)) ?? 0) || 0) + 1
  await env.FIOKOK.put(kulcs, String(szam))
  return jsonValasz({ ok: true, szam })
}
