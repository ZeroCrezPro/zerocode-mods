/** GET /api/megtekintes -> { slug: megtekintések } minden modra (nyilvános) */
import mods from '../../../src/data/mods.json' with { type: 'json' }
import { jsonValasz } from '../../_lib/fiok.js'

export async function onRequestGet({ env }) {
  const ki = {}
  if (env.FIOKOK) {
    await Promise.all(
      mods.map(async (m) => {
        ki[m.slug] = Number((await env.FIOKOK.get(`megtekintes:${m.slug}`)) ?? 0) || 0
      }),
    )
  }
  return new Response(JSON.stringify({ ok: true, szamok: ki }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  })
}

export const onRequestPost = () => jsonValasz({ ok: false, hiba: 'A slug kell az útvonalban.' }, 404)
