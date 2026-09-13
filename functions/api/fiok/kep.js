/**
 * POST /api/fiok/kep     - profilkép feltöltése (a törzs maga a kép; Content-Type: image/webp|jpeg|png)
 * DELETE /api/fiok/kep   - profilkép törlése
 * Mindkettő csak bejelentkezve. A kép a /api/fiok/kep/<azonosító> címen jön vissza.
 */
import {
  bejelentkezettFiok,
  KEP_MERET_HATAR,
  KEP_TIPUSOK,
  kepMent,
  kepTorol,
  jsonValasz,
  nyilvanosFiok,
} from '../../_lib/fiok.js'

export async function onRequestPost({ request, env }) {
  const fiok = await bejelentkezettFiok(request, env)
  if (!fiok) return jsonValasz({ ok: false, hiba: 'Nem vagy bejelentkezve.' }, 401)

  const tipus = (request.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase()
  if (!KEP_TIPUSOK.has(tipus)) return jsonValasz({ ok: false, hiba: 'Csak WebP, JPEG vagy PNG kép lehet.' }, 400)
  const bajtok = await request.arrayBuffer()
  if (!bajtok.byteLength) return jsonValasz({ ok: false, hiba: 'Üres kép.' }, 400)
  if (bajtok.byteLength > KEP_MERET_HATAR) return jsonValasz({ ok: false, hiba: 'A kép túl nagy (legfeljebb 400 kB).' }, 413)

  await kepMent(env.FIOKOK, fiok, bajtok, tipus)
  return jsonValasz({ ok: true, fiok: nyilvanosFiok(fiok) })
}

export async function onRequestDelete({ request, env }) {
  const fiok = await bejelentkezettFiok(request, env)
  if (!fiok) return jsonValasz({ ok: false, hiba: 'Nem vagy bejelentkezve.' }, 401)
  await kepTorol(env.FIOKOK, fiok)
  return jsonValasz({ ok: true, fiok: nyilvanosFiok(fiok) })
}
